import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    GuildMember,
    Role,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
} from "discord.js";
import { PRIVATE_RESPONSE_FLAGS, withPrivateNotice } from "../../utils/private-response";

const FIELD_ROLE_NAMES = [
    "반도체/소자",
    "전자회로/전기",
    "코딩/AI",
    "기계/제작",
    "화학/재료",
    "우주/항공",
    "원자력/핵",
    "기타",
] as const;

const SELECT_ID = "field-roles-select";
const APPLY_ID = "field-roles-apply";
const CLEAR_ID = "field-roles-clear";
const MENU_TIMEOUT_MS = 5 * 60 * 1000;
const pendingUpdates = new Set<string>();

function getSelectedRoleIds(roles: Role[], member: GuildMember): Set<string> {
    return new Set(
        roles.filter(role => member.roles.cache.has(role.id)).map(role => role.id)
    );
}

function buildSelectMenu(roles: Role[], selectedRoleIds: Set<string>, disabled = false) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId(SELECT_ID)
        .setPlaceholder("지정할 분야 역할을 모두 선택하세요")
        .setMinValues(0)
        .setMaxValues(roles.length)
        .setDisabled(disabled)
        .addOptions(roles.map(role => ({
            label: role.name,
            value: role.id,
            default: selectedRoleIds.has(role.id),
        })));

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

function buildActionButtons(selectedRoleIds: Set<string>, disabled = false) {
    const applyButton = new ButtonBuilder()
        .setCustomId(APPLY_ID)
        .setLabel("적용")
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled);
    const clearButton = new ButtonBuilder()
        .setCustomId(CLEAR_ID)
        .setLabel("선택 모두 해제")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || selectedRoleIds.size === 0);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(applyButton, clearButton);
}

function buildComponents(roles: Role[], selectedRoleIds: Set<string>, disabled = false) {
    return [
        buildSelectMenu(roles, selectedRoleIds, disabled),
        buildActionButtons(selectedRoleIds, disabled),
    ];
}

function formatSelectedRoles(roles: Role[], selectedRoleIds: Set<string>): string {
    const names = roles
        .filter(role => selectedRoleIds.has(role.id))
        .map(role => role.name);
    return names.length > 0 ? names.join(", ") : "없음";
}

export const data = new SlashCommandBuilder()
    .setName("role-setup")
    .setNameLocalizations({ ko: "역할설정" })
    .setDescription("Choose or remove your self-assignable field roles")
    .setDescriptionLocalizations({ ko: "내 분야 역할을 여러 개 지정하거나 삭제합니다" });

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        return interaction.reply({
            content: withPrivateNotice("서버에서만 사용할 수 있는 명령어입니다."),
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    await interaction.deferReply({ flags: PRIVATE_RESPONSE_FLAGS });
    const guild = interaction.guild;
    await guild.roles.fetch();
    const member = await guild.members.fetch(interaction.user.id);
    const configuredRoles = FIELD_ROLE_NAMES
        .map(name => guild.roles.cache
            .filter(role => role.name === name)
            .sort((a, b) => b.position - a.position)
            .first())
        .filter((role): role is Role => role !== undefined);
    const manageableRoles = configuredRoles.filter(role => role.editable && !role.managed);
    const unavailableRoleNames = FIELD_ROLE_NAMES.filter(name =>
        !manageableRoles.some(role => role.name === name)
    );

    if (manageableRoles.length === 0) {
        return interaction.editReply({
            content: withPrivateNotice(
                "지정할 수 있는 분야 역할을 찾지 못했습니다. 역할 이름과 봇 역할 순서를 확인해 주세요."
            ),
        });
    }

    const unavailableText = unavailableRoleNames.length > 0
        ? `\n현재 변경 불가: ${unavailableRoleNames.join(", ")}`
        : "";
    let selectedRoleIds = getSelectedRoleIds(manageableRoles, member);
    const message = await interaction.editReply({
        content: withPrivateNotice(
            `원하는 분야 역할을 선택한 뒤 **적용** 버튼을 눌러 주세요.\n선택된 역할: ${formatSelectedRoles(manageableRoles, selectedRoleIds)}${unavailableText}`
        ),
        components: buildComponents(manageableRoles, selectedRoleIds),
    });

    const collector = message.createMessageComponentCollector({
        filter: component =>
            component.user.id === interaction.user.id
            && (component.customId === SELECT_ID
                || component.customId === APPLY_ID
                || component.customId === CLEAR_ID),
        time: MENU_TIMEOUT_MS,
    });

    collector.on("collect", async component => {
        await component.deferUpdate();

        if (component.isStringSelectMenu()) {
            const allowedRoleIds = new Set(manageableRoles.map(role => role.id));
            selectedRoleIds = new Set(
                component.values.filter(roleId => allowedRoleIds.has(roleId))
            );
            await interaction.editReply({
                content: withPrivateNotice(
                    `선택을 저장했습니다. **적용** 버튼을 눌러야 실제 역할이 변경됩니다.\n선택된 역할: ${formatSelectedRoles(manageableRoles, selectedRoleIds)}${unavailableText}`
                ),
                components: buildComponents(manageableRoles, selectedRoleIds),
            });
            return;
        }

        if (component.customId === CLEAR_ID) {
            selectedRoleIds = new Set();
            await interaction.editReply({
                content: withPrivateNotice(
                    `모든 선택을 해제했습니다. 실제 역할을 삭제하려면 **적용** 버튼을 눌러 주세요.${unavailableText}`
                ),
                components: buildComponents(manageableRoles, selectedRoleIds),
            });
            return;
        }

        const updateKey = `${guild.id}:${interaction.user.id}`;
        if (pendingUpdates.has(updateKey)) {
            await interaction.editReply({
                content: withPrivateNotice("이전 역할 변경을 처리 중입니다. 잠시 후 다시 적용해 주세요."),
                components: buildComponents(manageableRoles, selectedRoleIds),
            });
            return;
        }

        pendingUpdates.add(updateKey);
        try {
            let updatedMember = await guild.members.fetch(interaction.user.id);
            const rolesToAdd = manageableRoles.filter(
                role => selectedRoleIds.has(role.id) && !updatedMember.roles.cache.has(role.id)
            );
            const rolesToRemove = manageableRoles.filter(
                role => !selectedRoleIds.has(role.id) && updatedMember.roles.cache.has(role.id)
            );

            if (rolesToAdd.length > 0) {
                updatedMember = await updatedMember.roles.add(rolesToAdd, "사용자 분야 역할 직접 지정");
            }
            if (rolesToRemove.length > 0) {
                updatedMember = await updatedMember.roles.remove(rolesToRemove, "사용자 분야 역할 직접 삭제");
            }
            selectedRoleIds = getSelectedRoleIds(manageableRoles, updatedMember);

            const changeLines = [
                rolesToAdd.length > 0 ? `지정: ${rolesToAdd.map(role => role.name).join(", ")}` : "",
                rolesToRemove.length > 0 ? `삭제: ${rolesToRemove.map(role => role.name).join(", ")}` : "",
            ].filter(Boolean);

            await interaction.editReply({
                content: withPrivateNotice(
                    changeLines.length > 0
                        ? `역할 설정을 적용했습니다.\n${changeLines.join("\n")}`
                        : "이미 선택한 역할 설정이 적용되어 있습니다."
                ),
                components: buildComponents(manageableRoles, selectedRoleIds),
            });
        } catch (error) {
            console.error("[field-roles] 역할 변경 실패:", error);
            await interaction.editReply({
                content: withPrivateNotice(
                    "역할을 변경하지 못했습니다. 봇 역할이 분야 역할보다 위에 있는지 확인해 주세요."
                ),
                components: buildComponents(manageableRoles, selectedRoleIds),
            });
        } finally {
            pendingUpdates.delete(updateKey);
        }
    });

    collector.on("end", async () => {
        const latestMember = await guild.members.fetch(interaction.user.id).catch(() => member);
        const appliedRoleIds = getSelectedRoleIds(manageableRoles, latestMember);
        await interaction.editReply({
            content: withPrivateNotice("분야 역할 선택 시간이 끝났습니다. 다시 변경하려면 `/역할설정`을 실행해 주세요."),
            components: buildComponents(manageableRoles, appliedRoleIds, true),
        }).catch(() => undefined);
    });
}
