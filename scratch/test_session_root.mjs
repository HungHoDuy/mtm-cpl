import { RuntimeSession } from '../CPL/team-sdlc-pack/src/runtime-session.mjs';

const session = new RuntimeSession();
const descriptor = {
  "schemaVersion": 1,
  "type": "PREPARE_GAME",
  "requestId": "prepare-8816db5b-9e04-4181-8b21-3a7aa22e17a6",
  "checkoutRoot": "D:\\mtm\\CPL\\matches\\38IX07C9",
  "matchRoot": "D:\\mtm\\CPL\\matches\\38IX07C9\\38IX07C9",
  "playerSessionId": "2cb60832-489c-4919-99d4-3c58ae4a02cb",
  "teamId": "CPL",
  "teamName": "[FHM] Còpilot",
  "matchId": "38IX07C9",
  "progressLogFile": "D:\\mtm\\CPL\\team-sdlc-pack\\logs\\38IX07C9.progress.ndjson",
  "teamSdlcPackWorkspace": "D:\\mtm\\CPL\\team-sdlc-pack",
  "username": "CPL_digital_cuder",
  "password": "8a7#amQ!",
  "repository": {
    "url": "https://github.com/lqdung863/mtm-cpl",
    "branch": "main",
    "folder": "38IX07C9"
  }
};

await session.configureSession(descriptor);

try {
  const prep = await session.prepareEnvironment({ skipGitClone: true, forceDbReset: false, skipBuild: true, skipDevServer: true });
  console.log('PREPARE RESULT:', prep);
} catch (e) {
  console.error('PREPARE ERROR:', e);
}
