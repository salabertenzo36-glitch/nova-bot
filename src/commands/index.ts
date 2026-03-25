import { createFunCommands } from "./modules/fun.js";
import { createModerationCommands } from "./modules/mod.js";
import { createTicketCommands } from "./modules/ticket.js";
import { createUtilityCommands } from "./modules/util.js";
import type { SlashCommand } from "../types/command.js";

export const allCommands: SlashCommand[] = [
  ...createModerationCommands(),
  ...createTicketCommands(),
  ...createUtilityCommands(),
  ...createFunCommands()
];
