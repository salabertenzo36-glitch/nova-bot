import { Collection } from "discord.js";

import { createPrefixedCommandsCache } from "./shared.js";
import type { PrefixCommand } from "../types/prefix-command.js";

export const prefix = "+";

export function buildPrefixCommandMap(): Collection<string, PrefixCommand> {
  const commands = new Collection<string, PrefixCommand>();

  for (const command of createPrefixedCommandsCache) {
    commands.set(command.name, command);
    for (const alias of command.aliases ?? []) {
      commands.set(alias, command);
    }
  }

  return commands;
}
