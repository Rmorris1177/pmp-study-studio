// Run with: node tests/validate-content.cjs
// Checks the course data embedded in index.html without external dependencies.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const match = html.match(/const course=(\[[^\n]+\]);/);
assert.ok(match, 'Course data must be present in index.html');
const course = JSON.parse(match[1]);
assert.equal(course.length, 12, 'Expected 12 lessons');

let count = 0;
let multiSelect = 0;
const prompts = new Set();
for (const [lessonIndex, lesson] of course.entries()) {
  assert.equal(lesson.sections.length, 3, `Lesson ${lessonIndex + 1} should have 3 sections`);
  for (const [sectionIndex, section] of lesson.sections.entries()) {
    assert.equal(section.qs.length, 10, `Lesson ${lessonIndex + 1}, section ${sectionIndex + 1} should have 10 questions`);
    assert.equal(section.objectives.length, 5, 'Each section should have 5 learning objectives');
    for (const [questionIndex, question] of section.qs.entries()) {
      const where = `Lesson ${lessonIndex + 1}, section ${sectionIndex + 1}, question ${questionIndex + 1}`;
      assert.ok(Array.isArray(question) && question.length >= 4, `${where}: invalid question format`);
      const [prompt, options, answer, explanation] = question;
      assert.ok(typeof prompt === 'string' && prompt.trim(), `${where}: empty prompt`);
      const normalized = prompt.trim().toLowerCase().replace(/\s+/g, ' ');
      assert.ok(!prompts.has(normalized), `${where}: duplicate question prompt`);
      prompts.add(normalized);
      assert.ok(Array.isArray(options) && options.length >= 2, `${where}: invalid choices`);
      assert.ok(options.every(x => typeof x === 'string' && x.trim()), `${where}: empty choice`);
      assert.equal(new Set(options.map(x => x.trim().toLowerCase())).size, options.length, `${where}: duplicate choices`);
      const correct = Array.isArray(answer) ? answer : [answer];
      assert.ok(correct.length > 0 && correct.every(i => Number.isInteger(i) && i >= 0 && i < options.length), `${where}: answer index out of range`);
      assert.equal(new Set(correct).size, correct.length, `${where}: repeated correct answer`);
      assert.ok(typeof explanation === 'string' && explanation.trim(), `${where}: missing explanation`);
      if (Array.isArray(answer)) multiSelect++;
      count++;
    }
  }
}
assert.equal(count, 360, 'Expected 360 questions');
console.log(`PASS: ${course.length} lessons, ${count} unique questions, ${multiSelect} multi-select questions, valid choices, answers and explanations.`);
