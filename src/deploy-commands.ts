import { REST, Routes } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";

const commandsData = Object.values(commands).map((command) => command.data.toJSON());

const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);

export async function deployCommands() {
    try {
        console.log("Started refreshing application (/) commands globally.");

        await rest.put(
            Routes.applicationCommands(config.DISCORD_CLIENT_ID),
            {
                body: commandsData,
            }
        );

        console.log("Successfully reloaded application (/) commands globally.");
    } catch (error) {
        console.error(error);
    }
}
