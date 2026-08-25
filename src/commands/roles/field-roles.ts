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
const CLEAR_ID = "field-roles-clear";
const MENU_TIMEOUT_MS = 5 * 60 * 1000;
const pendingUpdates = new Set<string>();

function buildSelectMenu(roles: Role[], member: GuildMember, disabled = false) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId(SELECT_ID)
        .setPlaceholder("지정할 분야 역할을 모두 선택하세요")
        .setMinValues(0)
        .setMaxValues(roles.length)
        .setDisabled(disabled)
        .addOptions(roles.map(role => ({
            label: role.name,
            value: role.id,
            default: member.roles.cache.has(role.id),
        })));

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

function buildClearButton(roles: Role[], member: GuildMember, disabled = false) {
    const hasFieldRole = roles.some(role => member.roles.cache.has(role.id));
    const button = new ButtonBuilder()
        .setCustomId(CLEAR_ID)
        .setLabel("분야 역할 모두 삭제")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled || !hasFieldRole);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
}

function buildComponents(roles: Role[], member: GuildMember, disabled = false) {
    return [
        buildSelectMenu(roles, member, disabled),
        buildClearButton(roles, member, disabled),
    ];
}

export const data = new SlashCommandBuilder()
    .setName("field-roles")
    .setNameLocalizations({ ko: "분야역할" })
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
    const message = await interaction.editReply({
        content: withPrivateNotice(
            `아래에서 원하는 분야 역할을 모두 선택하세요. 선택을 해제하면 해당 역할이 삭제됩니다.${unavailableText}`
        ),
        components: buildComponents(manageableRoles, member),
    });

    const collector = message.createMessageComponentCollector({
        filter: component =>
            component.user.id === interaction.user.id
            && (component.customId === SELECT_ID || component.customId === CLEAR_ID),
        time: MENU_TIMEOUT_MS,
    });

    collector.on("collect", async component => {
        await component.deferUpdate();
        const updateKey = `${guild.id}:${interaction.user.id}`;
        if (pendingUpdates.has(updateKey)) {
            await interaction.editReply({
                content: withPrivateNotice("이전 역할 변경을 처리 중입니다. 잠시 후 다시 선택해 주세요."),
                components: buildComponents(manageableRoles, member),
            });
            return;
        }

        pendingUpdates.add(updateKey);
        try {
            let updatedMember = await guild.members.fetch(interaction.user.id);
            const allowedRoleIds = new Set(manageableRoles.map(role => role.id));
            const selectedRoleIds = component.isStringSelectMenu()
                ? new Set(component.values.filter(roleId => allowedRoleIds.has(roleId)))
                : new Set<string>();
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

            const changeLines = [
                rolesToAdd.length > 0 ? `지정: ${rolesToAdd.map(role => role.name).join(", ")}` : "",
                rolesToRemove.length > 0 ? `삭제: ${rolesToRemove.map(role => role.name).join(", ")}` : "",
            ].filter(Boolean);

            await interaction.editReply({
                content: withPrivateNotice(
                    changeLines.length > 0 ? changeLines.join("\n") : "변경된 분야 역할이 없습니다."
                ),
                components: buildComponents(manageableRoles, updatedMember),
            });
        } catch (error) {
            console.error("[field-roles] 역할 변경 실패:", error);
            await interaction.editReply({
                content: withPrivateNotice(
                    "역할을 변경하지 못했습니다. 봇 역할이 분야 역할보다 위에 있는지 확인해 주세요."
                ),
                components: buildComponents(manageableRoles, member),
            });
        } finally {
            pendingUpdates.delete(updateKey);
        }
    });

    collector.on("end", async () => {
        const latestMember = await guild.members.fetch(interaction.user.id).catch(() => member);
        await interaction.editReply({
            content: withPrivateNotice("분야 역할 선택 시간이 끝났습니다. 다시 변경하려면 `/분야역할`을 실행해 주세요."),
            components: buildComponents(manageableRoles, latestMember, true),
        }).catch(() => undefined);
    });
}
