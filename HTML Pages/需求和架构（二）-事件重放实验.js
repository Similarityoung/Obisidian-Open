(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CourseReplay = api;
  if (typeof document !== 'undefined') api.init(document);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var events = Object.freeze([
    Object.freeze({ id: 'e1', type: 'plan-bound', label: '绑定 2024 培养方案', planId: '2024' }),
    Object.freeze({ id: 'e2', type: 'grade-recorded', label: 'MATH101 成绩 75', courseId: 'MATH101', score: 75, credits: 4 }),
    Object.freeze({ id: 'e3', type: 'grade-recorded', label: 'CS101 成绩 55（不及格）', courseId: 'CS101', score: 55, credits: 4 }),
    Object.freeze({ id: 'e4', type: 'grade-recorded', label: 'EXT201 成绩 80', courseId: 'EXT201', score: 80, credits: 4 }),
    Object.freeze({
      id: 'e5',
      type: 'substitution-approved',
      label: '批准 EXT201 替代 CS101；记录课程条件通过',
      fromCourse: 'CS101',
      toCourse: 'EXT201',
      decision: Object.freeze({
        id: 'd1',
        ruleId: '2024',
        passed: true,
        passedCredits: 8,
        basisEventIds: Object.freeze(['e1', 'e2', 'e3', 'e4'])
      })
    }),
    Object.freeze({
      id: 'e6',
      type: 'grade-corrected',
      label: '更正 MATH101：75 → 50',
      courseId: 'MATH101',
      previousScore: 75,
      score: 50,
      credits: 4
    })
  ]);

  var rules = Object.freeze({
    '2024': Object.freeze({
      id: '2024',
      label: '2024 原方案',
      minCredits: 8,
      requiredCourse: 'CS101',
      passingScore: 60,
      hypothetical: false,
      description: '已由 e1 绑定；课程条件要求至少 8 学分，且编程必修通过或有适用替代。'
    }),
    '2025': Object.freeze({
      id: '2025',
      label: '2025 假设方案',
      minCredits: 12,
      requiredCourse: 'CS101',
      passingScore: 60,
      hypothetical: true,
      description: '假设只把学分门槛改为 12，其余条件及替代关系保持不变；本事件流没有把它绑定为适用事实。'
    })
  });

  function clampStep(step) {
    var n = Number(step);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(events.length, Math.floor(n)));
  }

  function cloneGrade(event) {
    return {
      courseId: event.courseId,
      score: event.score,
      credits: event.credits,
      sourceEventId: event.id
    };
  }

  function reduceEvents(history) {
    return history.reduce(function (state, event) {
      if (event.type === 'plan-bound') {
        state.binding = { planId: event.planId, eventId: event.id, label: event.label };
      } else if (event.type === 'grade-recorded' || event.type === 'grade-corrected') {
        state.grades[event.courseId] = cloneGrade(event);
      } else if (event.type === 'substitution-approved') {
        state.substitutions.push({ eventId: event.id, ruleId: event.decision.ruleId, fromCourse: event.fromCourse, toCourse: event.toCourse });
        state.decisions.push({
          eventId: event.id,
          id: event.decision.id,
          ruleId: event.decision.ruleId,
          fromCourse: event.fromCourse,
          toCourse: event.toCourse,
          passedAtDecision: event.decision.passed,
          outcomeAtDecision: event.decision.passed ? '通过课程条件' : '未通过课程条件',
          passedCreditsAtDecision: event.decision.passedCredits,
          basisEventIds: event.decision.basisEventIds.slice()
        });
      }
      return state;
    }, { binding: null, grades: Object.create(null), substitutions: [], decisions: [] });
  }

  function evaluate(facts, rule) {
    var gradeList = Object.keys(facts.grades).map(function (key) {
      var grade = facts.grades[key];
      return { courseId: grade.courseId, score: grade.score, credits: grade.credits, sourceEventId: grade.sourceEventId, passed: grade.score >= rule.passingScore };
    });
    var passedGrades = gradeList.filter(function (grade) { return grade.passed; });
    var countedCourseIds = passedGrades.map(function (grade) { return grade.courseId; });
    var countedCredits = passedGrades.reduce(function (total, grade) { return total + grade.credits; }, 0);

    // A substitution is a requirement decision, not an extra course credit.
    var usableSubstitutions = facts.substitutions.filter(function (substitution) {
      var replacement = facts.grades[substitution.toCourse];
      return substitution.ruleId === rule.id && replacement && replacement.score >= rule.passingScore;
    });
    var directGrade = facts.grades[rule.requiredCourse];
    var directRequired = directGrade && directGrade.score >= rule.passingScore;
    var substitutedRequired = usableSubstitutions.some(function (substitution) {
      return substitution.fromCourse === rule.requiredCourse;
    });
    var requiredMet = Boolean(directRequired || substitutedRequired);
    var creditsMet = countedCredits >= rule.minCredits;
    return {
      grades: gradeList,
      passedCredits: countedCredits,
      countedCourseIds: countedCourseIds,
      creditLedger: passedGrades.map(function (grade) {
        return { courseId: grade.courseId, credits: grade.credits, sourceEventId: grade.sourceEventId, countedOnce: true };
      }),
      directRequired: Boolean(directRequired),
      substitutedRequired: substitutedRequired,
      requiredMet: requiredMet,
      creditsMet: creditsMet,
      overallPass: facts.binding ? creditsMet && requiredMet : null
    };
  }

  function derive(step, ruleId) {
    var selectedStep = arguments.length > 0 ? clampStep(step) : 5;
    var selectedRuleId = ruleId || '2024';
    if (!Object.prototype.hasOwnProperty.call(rules, selectedRuleId)) throw new RangeError('Unknown rule version: ' + selectedRuleId);
    var rule = rules[selectedRuleId];
    var appliedEvents = events.slice(0, selectedStep);
    var facts = reduceEvents(appliedEvents);
    var binding = facts.binding;
    var ruleMode = !binding ? 'unbound' : (binding.planId === rule.id ? 'applicable' : 'hypothetical');
    var current = evaluate(facts, rule);
    var status = !binding ? 'indeterminate' : (ruleMode === 'hypothetical' ? 'hypothetical' : 'computed');

    // Check an old decision with its own rule, regardless of the UI's hypothesis.
    var decisionViews = facts.decisions.map(function (decision) {
      var currentUnderOriginalRule = evaluate(facts, rules[decision.ruleId]);
      return {
        id: decision.id,
        eventId: decision.eventId,
        ruleId: decision.ruleId,
        fromCourse: decision.fromCourse,
        toCourse: decision.toCourse,
        outcomeAtDecision: decision.outcomeAtDecision,
        passedAtDecision: decision.passedAtDecision,
        passedCreditsAtDecision: decision.passedCreditsAtDecision,
        basisEventIds: decision.basisEventIds,
        preserved: true,
        sameRule: decision.ruleId === rule.id,
        reviewNeeded: currentUnderOriginalRule.overallPass !== decision.passedAtDecision,
        currentPassUnderOriginalRule: currentUnderOriginalRule.overallPass,
        notOverriddenByHypothesis: true
      };
    });

    var warnings = [];
    if (!binding) warnings.push('e0 截点尚无培养方案绑定事实，不能确定适用规则，课程条件不可判定。');
    if (ruleMode === 'hypothetical') warnings.push('当前为 2025 假设重算；不把假设当作适用事实，也不覆盖 e5 的 2024 决定。');
    if (decisionViews.some(function (decision) { return decision.reviewNeeded; })) {
      warnings.push('e6 改变了按原 2024 规则得到的当前推导；既有 e5 决定仍留证，并标记为需要复核。本页没有撤销该决定。');
    }

    return {
      step: selectedStep,
      appliedEventIds: appliedEvents.map(function (event) { return event.id; }),
      binding: binding,
      selectedRule: {
        id: rule.id,
        label: rule.label,
        hypothetical: rule.hypothetical,
        mode: ruleMode,
        description: rule.description
      },
      status: status,
      current: current,
      decisions: decisionViews,
      warnings: warnings
    };
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function runSelfTests() {
    var checks = [];
    function check(name, fn) {
      try {
        fn();
        checks.push({ name: name, ok: true });
      } catch (error) {
        checks.push({ name: name, ok: false, error: error.message });
      }
    }
    check('e0 无绑定时不可判定', function () {
      var out = derive(0, '2024');
      assert(out.status === 'indeterminate', 'status should be indeterminate');
      assert(out.binding === null, 'binding should be null');
    });
    check('e5 记录 2024 决定并满足课程条件', function () {
      var out = derive(5, '2024');
      assert(out.current.passedCredits === 8, 'e5 credits should be 8');
      assert(out.current.requiredMet === true, 'e5 required course should be met by substitution');
      assert(out.current.overallPass === true, 'e5 should pass course conditions');
      assert(out.decisions[0].outcomeAtDecision === '通过课程条件', 'e5 decision evidence missing');
    });
    check('替代课程不重复计学分', function () {
      var out = derive(5, '2024');
      assert(out.current.countedCourseIds.length === 2, 'only MATH101 and EXT201 should count');
      assert(new Set(out.current.countedCourseIds).size === out.current.countedCourseIds.length, 'course ids must be unique');
      assert(out.current.passedCredits === 8, 'substitution must not add another 4 credits');
    });
    check('e6 当前不通过但 e5 决定留证并需复核', function () {
      var out = derive(6, '2024');
      assert(out.current.passedCredits === 4, 'corrected MATH101 should remove 4 credits');
      assert(out.current.overallPass === false, 'e6 current result should fail');
      assert(out.decisions[0].preserved === true, 'e5 decision must be preserved');
      assert(out.decisions[0].reviewNeeded === true, 'e5 decision should require review');
    });
    check('假设规则不覆盖原 2024 决定', function () {
      var out = derive(5, '2025');
      assert(out.status === 'hypothetical', '2025 should be marked hypothetical');
      assert(out.decisions[0].ruleId === '2024', 'decision must retain original rule');
      assert(out.decisions[0].notOverriddenByHypothesis === true, 'hypothesis must not override evidence');
      assert(out.current.requiredMet === false, '2025 must not apply the 2024 substitution decision');
      assert(out.current.overallPass === false, '2025 threshold should be recomputed separately');
    });
    return checks;
  }

  function byId(document, id) { return document.getElementById(id); }
  function setText(document, id, text) {
    var node = byId(document, id);
    if (node) node.textContent = text;
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character];
    });
  }
  function init(document) {
    var root = byId(document, 'courseReplayApp');
    if (!root || root.getAttribute('data-mounted') === 'true') return;
    root.setAttribute('data-mounted', 'true');
    var loading = byId(document, 'loadingMessage');
    if (loading) loading.hidden = true;
    var state = { step: 5, ruleId: '2024' };
    var range = byId(document, 'stepRange');
    var stepLabel = byId(document, 'stepLabel');
    var ruleButtons = Array.prototype.slice.call(document.querySelectorAll('[data-rule-id]'));
    var eventList = byId(document, 'eventList');
    var decisionList = byId(document, 'decisionList');
    var warningList = byId(document, 'warningList');

    function render() {
      var out = derive(state.step, state.ruleId);
      if (range) range.value = String(state.step);
      if (stepLabel) stepLabel.textContent = '第 ' + state.step + ' / ' + events.length + ' 步';
      setText(document, 'bindingValue', out.binding ? out.binding.planId + '（依据 ' + out.binding.eventId + '）' : '无绑定');
      setText(document, 'ruleValue', out.selectedRule.label + (out.selectedRule.hypothetical ? ' · 假设' : ''));
      var statusText = out.status === 'indeterminate' ? '不可判定' : (out.current.overallPass ? '课程条件满足' : '课程条件不满足');
      setText(document, 'statusValue', '第 ' + state.step + ' 步 · ' + out.selectedRule.label + ' · ' + statusText);
      setText(document, 'creditValue', out.current.passedCredits + ' / 至少 ' + rules[out.selectedRule.id].minCredits + ' 学分');
      setText(document, 'requiredValue', out.current.requiredMet ? '满足（' + (out.current.substitutedRequired ? 'EXT201 替代' : 'CS101 通过') + '）' : '不满足');
      setText(document, 'countedValue', out.current.countedCourseIds.length ? out.current.countedCourseIds.join('、') + '（各计一次）' : '无');
      setText(document, 'basisValue', out.appliedEventIds.length ? out.appliedEventIds.join('、') : '无');
      setText(document, 'modeValue', out.selectedRule.mode === 'hypothetical' ? '假设重算，不改变事实' : (out.selectedRule.mode === 'unbound' ? '等待方案绑定' : '适用规则')); 
      var statusNode = byId(document, 'statusValue');
      if (statusNode) statusNode.dataset.state = out.status;
      ruleButtons.forEach(function (button) {
        var selected = button.getAttribute('data-rule-id') === state.ruleId;
        button.setAttribute('aria-pressed', String(selected));
      });
      if (eventList) {
        eventList.innerHTML = events.map(function (event, index) {
          var active = index < state.step;
          var marker = active ? '已纳入' : '尚未纳入';
          var extra = event.type === 'grade-corrected' ? '；更正会改变当前推导' : '';
          return '<li class="event-row ' + (active ? 'is-active' : 'is-future') + '">' +
            '<span class="event-id">' + escapeHtml(event.id) + '</span>' +
            '<span class="event-copy"><b>' + escapeHtml(event.label) + '</b><small>' + escapeHtml(marker + extra) + '</small></span>' +
            '</li>';
        }).join('');
      }
      if (decisionList) {
        decisionList.innerHTML = out.decisions.length ? out.decisions.map(function (decision) {
          var review = decision.reviewNeeded ? '<span class="decision-flag">需要复核</span>' : '<span class="decision-flag is-ok">留证</span>';
          var relation = decision.sameRule ? '当前规则同为 ' + decision.ruleId : '原决定规则 ' + decision.ruleId;
          var basis = decision.basisEventIds && decision.basisEventIds.length ? '依据 ' + decision.basisEventIds.join('、') : '依据事件未记录';
          return '<li><b>' + escapeHtml(decision.eventId) + '</b>：' + escapeHtml(decision.outcomeAtDecision) + '；' + escapeHtml(relation) + '；' + escapeHtml(basis) + '。' + review + '</li>';
        }).join('') : '<li class="muted">当前步数尚无审批决定。</li>';
      }
      if (warningList) {
        warningList.innerHTML = out.warnings.length ? out.warnings.map(function (warning) { return '<li>' + escapeHtml(warning) + '</li>'; }).join('') : '<li class="muted">当前没有额外警告。</li>';
      }
      var gradeRows = byId(document, 'gradeRows');
      if (gradeRows) {
        gradeRows.innerHTML = out.current.grades.length ? out.current.grades.map(function (grade) {
          return '<tr><th scope="row">' + escapeHtml(grade.courseId) + '</th><td>' + grade.score + '</td><td>' + grade.credits + '</td><td>' + (grade.passed ? '通过' : '不通过') + '</td><td>' + escapeHtml(grade.sourceEventId) + '</td></tr>';
        }).join('') : '<tr><td colspan="5" class="muted">尚无成绩事件。</td></tr>';
      }
      var testResults = runSelfTests();
      var testNode = byId(document, 'testStatus');
      if (testNode) {
        var failed = testResults.filter(function (result) { return !result.ok; });
        testNode.textContent = failed.length ? ('内置断言失败：' + failed.length) : '内置断言：5 项通过';
        testNode.dataset.state = failed.length ? 'error' : 'ok';
      }
    }

    ruleButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        state.ruleId = button.getAttribute('data-rule-id');
        render();
      });
    });
    if (range) range.addEventListener('input', function () { state.step = clampStep(range.value); render(); });
    var actions = document.querySelectorAll('[data-action]');
    Array.prototype.forEach.call(actions, function (button) {
      button.addEventListener('click', function () {
        var action = button.getAttribute('data-action');
        if (action === 'next') state.step = Math.min(events.length, state.step + 1);
        if (action === 'previous') state.step = Math.max(0, state.step - 1);
        if (action === 'reset') state.step = 0;
        if (action === 'append-correction') state.step = 6;
        render();
      });
    });
    render();
  }

  return { events: events, rules: rules, derive: derive, runSelfTests: runSelfTests, init: init };
});
