import fs from 'node:fs';

const filePath = 'D:/mtm/team-orchestrator-pack/src/runtime-session.mjs';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = 'getClusterSnapshot() {';
const endMarker = '    const activeWorkersList = [];';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const replacement = `getClusterSnapshot() {
    const matchRoot = this.getMatchRoot();
    const unassignedTasks = [];
    let urgentPI = null;

    // Combine candidate items from backlogRegistry and taskQueue
    const allCandidates = new Map();
    for (const [key, item] of this.backlogRegistry.entries()) {
      allCandidates.set(key, item);
    }
    if (Array.isArray(this.taskQueue)) {
      for (const item of this.taskQueue) {
        if (item && item.key) {
          allCandidates.set(item.key, {
            ...item,
            ...(allCandidates.get(item.key) || {})
          });
        }
      }
    }

    // Discover any unassigned items
    for (const [key, item] of allCandidates.entries()) {
      const upperKey = key.toUpperCase();
      if (this.submittedBacklogs.has(upperKey)) continue;
      if (this.clusterWorkers.has(key) || this.clusterWorkers.has(upperKey)) continue;

      const receiptPath = path.resolve(matchRoot, 'answers', key, 'evidence', 'submission-receipt.json');
      if (fs.existsSync(receiptPath)) {
        this.submittedBacklogs.add(upperKey);
        continue;
      }

      const isItemPI = this.isPI(key) || item.type === 'PI' || item.isPI === true;
      const taskObj = {
        key,
        type: item.type || (isItemPI ? 'PI' : 'TASK'),
        title: item.title || key,
        points: item.points || 100,
        deadlineSeconds: item.deadlineSeconds || null
      };

      if (isItemPI && !urgentPI) {
        urgentPI = taskObj;
      }
      unassignedTasks.push(taskObj);
    }
\r\n`;

content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched getClusterSnapshot!');
