# Team Orchestrator Pack — Documentation Index

This directory links to the comprehensive Master The Machine (MTM) documentation set located in [d:/mtm/docs/](file:///d:/mtm/docs/):

1. **[00 - Master Overview & System Architecture](file:///d:/mtm/docs/README.md)**  
   System components, credentials mapping from `.env`, architecture diagram, and quick-start checklist.

2. **[01 - Game Rules & Scoring System](file:///d:/mtm/docs/01_GAME_RULES_AND_SCORING.md)**  
   40-minute match flow, 1,000 max points, 4 backlog types (`TASK`, `CR`, `BUG`, `PI`), MVS verification, speed race for PI, computer access penalties (-50 pts), tie-breakers, and prohibited actions.

3. **[02 - Digital Cuder Machine-to-Machine API Specification](file:///d:/mtm/docs/02_DIGITAL_CUDER_API.md)**  
   `Start work` and `Submit` endpoints, Match UUID vs 8-char ID distinction, Bearer token authentication, idempotency keys, request/response schemas, retry logic, and error code dictionary.

4. **[03 - Team Orchestrator Technical Guide](file:///d:/mtm/docs/03_TEAM_ORCHESTRATOR_TECHNICAL_GUIDE.md)**  
   Orchestrator role (PM + 4 specialists), Node.js MCP Helper runtime, mandatory `<matchId>.progress.ndjson` logging, 23-step lifecycle sequence, guardrails, and packaging specifications.

5. **[04 - Setup, Installation & Debugging Guide](file:///d:/mtm/docs/04_SETUP_AND_DEBUGGING_GUIDE.md)**  
   Prerequisites, MTM Player portable installation, team pack modification exercises, Practice Match execution, and the 4-location debugging framework.
