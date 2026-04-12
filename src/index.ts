#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { IOfficeClient } from './client.js';
import { registerBuildingTools } from './tools/buildings.js';
import { registerFloorTools } from './tools/floors.js';
import { registerSpaceTools } from './tools/spaces.js';
import { registerUserTools } from './tools/users.js';
import { registerReservationTools } from './tools/reservations.js';
import { registerVisitorTools } from './tools/visitors.js';
import { registerMaintenanceTools } from './tools/maintenance.js';
import { registerMailTools } from './tools/mail.js';
import { registerMoveTools } from './tools/moves.js';

const client = new IOfficeClient();

const server = new McpServer(
  { name: 'ioffice', version: '2.0.2' },
  { capabilities: { tools: {} } }
);

registerBuildingTools(server, client);
registerFloorTools(server, client);
registerSpaceTools(server, client);
registerUserTools(server, client);
registerReservationTools(server, client);
registerVisitorTools(server, client);
registerMaintenanceTools(server, client);
registerMailTools(server, client);
registerMoveTools(server, client);

console.error('[ioffice-mcp] This project was developed and is maintained by AI (Claude Sonnet 4.6). Use at your own discretion.');

const transport = new StdioServerTransport();
await server.connect(transport);
