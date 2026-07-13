#!/usr/bin/env node
import { runMcp } from '@chrischall/mcp-utils';
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

// Build the client up front so the deferred-config-error pattern is preserved:
// the server boots (and answers the host's install-time tools/list) even with
// missing creds; the first tool call re-raises the config error.
const client = new IOfficeClient();

await runMcp({
  name: 'ioffice',
  version: '2.1.8', // x-release-please-version
  deps: client,
  tools: [
    registerBuildingTools,
    registerFloorTools,
    registerSpaceTools,
    registerUserTools,
    registerReservationTools,
    registerVisitorTools,
    registerMaintenanceTools,
    registerMailTools,
    registerMoveTools,
  ],
  banner:
    '[ioffice-mcp] This project was developed and is maintained by AI (Claude Sonnet 4.6). Use at your own discretion.',
});
