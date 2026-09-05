import {
    ChatInputCommandInteraction,
    MessageContextMenuCommandInteraction,
} from "discord.js";
import { hasServerAdminAccess } from "./admin-access";

type PromotionInteraction = ChatInputCommandInteraction | MessageContextMenuCommandInteraction;

export async function hasPromotionAdminAccess(interaction: PromotionInteraction): Promise<boolean> {
    return hasServerAdminAccess(interaction);
}
