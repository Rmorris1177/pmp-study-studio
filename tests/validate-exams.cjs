// Run with: node tests/validate-exams.cjs
// Tests the actual exam generation functions from index.html, without a browser.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const match = html.match(/const course=(\[[^\n]+\]);/);
assert.ok(match, 'Missing embedded course data');
const course = JSON.parse(match[1]);
const begin = html.indexOf('function examPool()');
const end = html.indexOf('function renderExam()', begin);
assert.ok(begin !== -1 && end > begin, 'Missing exam functions');
const source = html.slice(begin, end);
const makeHarness = new Function('course', `
  let state = {};
  ${source}
  return { startExam, examTimeRemaining, formatExamTime, getExam: () => state.exam };
`);
const exam = makeHarness(course);

for (const size of [30, 60]) {
  for (const timed of [false, true]) {
    for (let trial = 0; trial < 20; trial++) {
      exam.startExam(size, timed);
      const run = exam.getExam();
      assert.equal(run.items.length, size, 'Incorrect exam length');
      assert.equal(run.pos, 0, 'Exam should start at question zero');
      assert.equal(run.finishedAt, null, 'New exam must be unfinished');
      assert.equal(run.durationMs, timed ? size * 230000 : null, 'Incorrect duration');
      assert.ok(run.items.every(x => !x.locked && x.pick.length === 0), 'Answers should start blank');
      const ids = run.items.map(x => [x.n, x.j, x.k].join('-'));
      assert.equal(new Set(ids).size, size, 'Exam contains duplicate questions');
      const counts = course.map((_, n) => run.items.filter(x => x.n === n).length);
      assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, 'Lessons not balanced');
      assert.equal(exam.examTimeRemaining(run) === null, !timed, 'Wrong timer mode');
      if (timed) {
        const expired = { ...run, startedAt: Date.now() - run.durationMs - 1 };
        assert.equal(exam.examTimeRemaining(expired), 0, 'Expired exam must have zero time');
      }
    }
  }
}
assert.equal(exam.formatExamTime(6900000), '115:00');
assert.equal(exam.formatExamTime(13800000), '230:00');
assert.equal(exam.formatExamTime(1001), '0:02');
assert.equal(exam.formatExamTime(0), '0:00');
console.log('PASS: 80 exam generations across four modes; uniqueness, lesson balance, timers, and answer initialization.');
