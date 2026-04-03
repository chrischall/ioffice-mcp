#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { IOfficeClient } from './client.js';
import { toolDefinitions as buildingTools, handleTool as handleBuildings } from './tools/buildings.js';
import { toolDefinitions as floorTools, handleTool as handleFloors } from './tools/floors.js';
import { toolDefinitions as spaceTools, handleTool as handleSpaces } from './tools/spaces.js';
import { toolDefinitions as userTools, handleTool as handleUsers } from './tools/users.js';
import { toolDefinitions as reservationTools, handleTool as handleReservations } from './tools/reservations.js';
import { toolDefinitions as visitorTools, handleTool as handleVisitors } from './tools/visitors.js';
import { toolDefinitions as maintenanceTools, handleTool as handleMaintenance } from './tools/maintenance.js';
import { toolDefinitions as mailTools, handleTool as handleMail } from './tools/mail.js';
import { toolDefinitions as moveTools, handleTool as handleMoves } from './tools/moves.js';

const client = new IOfficeClient();

const allTools = [
  ...buildingTools,
  ...floorTools,
  ...spaceTools,
  ...userTools,
  ...reservationTools,
  ...visitorTools,
  ...maintenanceTools,
  ...mailTools,
  ...moveTools,
];

const handlers: Record<string, (name: string, args: Record<string, unknown>) => Promise<CallToolResult>> = {};

for (const tool of buildingTools) handlers[tool.name] = (n, a) => handleBuildings(n, a, client);
for (const tool of floorTools) handlers[tool.name] = (n, a) => handleFloors(n, a, client);
for (const tool of spaceTools) handlers[tool.name] = (n, a) => handleSpaces(n, a, client);
for (const tool of userTools) handlers[tool.name] = (n, a) => handleUsers(n, a, client);
for (const tool of reservationTools) handlers[tool.name] = (n, a) => handleReservations(n, a, client);
for (const tool of visitorTools) handlers[tool.name] = (n, a) => handleVisitors(n, a, client);
for (const tool of maintenanceTools) handlers[tool.name] = (n, a) => handleMaintenance(n, a, client);
for (const tool of mailTools) handlers[tool.name] = (n, a) => handleMail(n, a, client);
for (const tool of moveTools) handlers[tool.name] = (n, a) => handleMoves(n, a, client);

const server = new Server(
  { name: 'ioffice', version: '2.0.1' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: allTools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const handler = handlers[name];
  if (!handler) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }
  try {
    return await handler(name, args as Record<string, unknown>);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

console.error('[ioffice-mcp] This project was developed and is maintained by AI (Claude Sonnet 4.6). Use at your own discretion.');

const transport = new StdioServerTransport();
await server.connect(transport);
