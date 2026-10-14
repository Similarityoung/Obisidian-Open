# Requirements and Architecture (2): A Controlled-English Reading Text

## 中文使用说明

这份文本整理课程第 7 讲，也是“需求与架构”两讲中的第二讲，按原文的十二章组织。它采用接近 ASD-STE100 的短句、主动语态、稳定术语和直接表达。用户提出的“80% ASD-STE100”是风格接近度目标，不是可验证的合规比例，也不是认证文本。本稿没有完成 ASD-STE100 受控词典的逐词审计。请把课程中的判断、示例和编者说明分开阅读。文中 `[Course point]` 表示课程观点或课堂论证；`[Teaching example]` 表示用于讲解的示例；`[Editorial caveat]` 表示本整理稿的限定或校正。`My understanding` 一节暂留给用户填写，本稿不代写个人理解。

## My Understanding (For Learner Completion)

This section remains blank for the learner. Add personal understanding after review.

## 1. Complexity and Architecture

[Course point] Software development moves from intent to a specification and then to an implementation. These steps can follow different paths. Each choice reduces some possibilities and creates a technical commitment.

Architecture starts in a ten-line program. It also appears in a system with millions of lines. Good architecture asks what may change and where that change can go.

Essential complexity comes from the problem domain. Course selection may require capacity, prerequisites, time conflicts, rooms, approvals, and exceptions. Architecture cannot remove these facts. Accidental complexity comes from an implementation choice. A file system and a database can represent the same business rule with different costs.

Requirements reduce uncertainty about intent. Architecture reduces unnecessary choices in the specification and implementation. “Capacity is 100” still needs rules for waiting lists, reserved seats, and special approval. Each rule adds a promise to test and maintain.

[Editorial caveat] Brooks used essential and accidental complexity to separate domain difficulty from representation difficulty. Accidental complexity still matters. Teams can often reduce it through architecture.

## 2. Respect the Small Head

[Course point] A person cannot track a large program as one mental object. A programmer needs abstraction and hierarchical decomposition. These tools turn many details into layers that a person can inspect.

Dijkstra described the limitation directly. A small human head must respect its limits. Structured programming used sequence, selection, and iteration to control reasoning.

Enumeration checks a finite set of cases. Induction explains repetition and recursion. Abstraction lets a caller rely on a promised effect instead of an internal process. A software design can resemble a necklace. Each bead carries one decision. The links between beads form a larger system.

The order of decisions matters. If a layer chooses a row-based image representation too early, later layers must understand rows. If the layer delays that choice, later layers can still reason about an image. A delayed representation often reduces the spread of change.

A class groups data and operations. An object keeps state. A coroutine keeps its position and resumes later. A subprogram uses call and return.

[Teaching example] A linked-list layer can support a simulation layer. The simulation layer can support a factory model. Each layer hides earlier details.

## 3. Architecture Designs a Solution Space

[Course point] A good architecture does not select one final solution for every future need. It defines rules that let a family of solutions grow.

A useful name can carry prior knowledge. A programmer can think about a transaction or an enrollment rule without reopening every implementation detail.

Steele's “Growing a Language” illustrates this idea. A tiny language may be easy to move but too weak for real work. A very large language may arrive too late. A growing language adds features through stable rules. An extension must be a normal design element. It must use the same composition rules as core features.

Software needs the same property. A team can fix a data exchange rule today and allow a new processing step tomorrow. A team can define an interface today and replace its implementation later. The design fixes collaboration rules and leaves local choices open.

[Course point] Reading classic papers should ask what a design lets users choose and what rules make those choices compatible.

[Editorial caveat] A solution space is not an excuse to avoid decisions. The team must fix contracts that protect composition.

## 4. UNIX: Composition Through Common Rules

[Course point] The UNIX lesson has three linked rules. Each program should do one thing well. Programs should work together. Programs should handle text streams through a common interface.

Text streams connect people, files, and programs. A person can read a stream. Another program can consume the same stream.

Standard input carries input. Standard output carries normal results. Standard error carries diagnostics. A process also returns an exit status.

These conventions make composition possible. Command options need shared forms. A double hyphen can end option parsing. Machine output should not mix colors with data. A delimiter becomes part of the protocol.

[Teaching example] A user can send JSON to `jq`, send the result to `fzf`, and use the selection in another command. The designer supplied composition rules.

[Editorial caveat] Text is not automatically a safe protocol. Producers and consumers must agree on encoding, fields, separators, and error status.

## 5. Relational Databases: Separate Meaning from Storage

[Course point] Codd's relational model protects users from disruptive changes in physical data representation. The model describes logical relations. The database system manages storage and execution.

A library example makes the split clear. The domain records a reader, a book, and a loan relation. A query can ask which books a reader has. Another query can ask who has a book. Both queries use the same logical facts.

The database can change indexes, pages, or scan order without changing those questions. SQL provides a language for relations and queries. Transactions move the database between states. Views present a selected understanding of the current state.

[Course point] A flexible interface tends to grow a language. UNIX shell and SQL both have syntax, semantics, and composition rules.

[Editorial caveat] A relational database does not remove domain complexity. It can enforce constraints and coordinate updates. Teams must still define entities, time, authority, and exceptions.

## 6. Internet: Keep Cooperation During Change

[Course point] The Internet provides connectivity without prescribing every application. Layers divide responsibilities. An application requests a service. Transport can provide delivery properties. IP moves datagrams across networks. Link protocols move data between neighboring devices.

A client can change one layer without redesigning all other layers. A network can change hardware and paths while an application keeps its protocol.

RFC 1958 states that technical change is continuous. The lecture compares the Internet with a city. Streets and buildings change, but common routes keep the city usable. TCP congestion control still requires careful engineering.

Telnet gave way to SSH for secure remote access. FTP and HTTP gained secure successors. SMTP and IMAP still support email. These changes show evolution above stable agreements.

[Editorial caveat] TCP can fail. HTTPS is not universal. The Internet example does not prove that every system needs many layers. Layers help when responsibilities change independently.

## 7. From One Page and One SQL Transaction to MVC

[Course point] Early business systems mapped each request to a database transaction and each page to a database view. A course request could read data, check rules, write enrollment, and return a page.

This design worked well for stable CRUD work. CRUD can issue transactions and enforce local rules. It does not by itself preserve every historical fact. It became risky when each page copied business rules. A student page and an administrator page could apply different capacity rules.

Java Web tools changed page construction. Servlets produced HTML from Java. JSP put server code inside an HTML template. JSTL and expression language later reduced script fragments. Templates improved page maintenance. They did not place business rules in the correct module.

MVC assigns changes to different parts. The Model represents domain knowledge and business operations. The View presents the Model. The Controller translates user input into Model calls.

[Teaching example] A course page can change from a list to a calendar in the View. A capacity rule belongs in the Model. A new administrator entry point belongs in a Controller that reuses Model operations and checks authority.

[Editorial caveat] MVC is a separation idea, not one fixed framework. Exact boundaries depend on the system and on the chosen web technology.

## 8. Interface State: MVVM and React

[Course point] A modern interface has state that does not belong in a business database. Search text, open menus, hover feedback, and selected tabs still affect the program.

A useful relation is `View = render(Model, ViewState)`. ViewState deserves a design even when the system does not persist it.

MVVM places presentation state and behavior in a ViewModel. A course filter can store `query`. It can derive `visibleCourses` from courses and query. The system should store the source state and compute the derived list.

Vue `computed` tracks reactive dependencies. Vue `v-model` connects a control value and an input event. This local two-way connection does not mean that all data flows freely in two directions. Properties still normally flow from parent to child.

React describes a render from current properties and state. An update requests a later render. A render receives a state snapshot. A derived list need not become another state field.

[Editorial caveat] React is not the same as MVVM. They address related concerns through different mechanisms. The lecture does not define React as an MVVM implementation.

## 9. A Model Alone Does Not Hold All Complexity

[Course point] MVC and CRUD suit many local operations. They become less sufficient when a business process crosses time and several rules.

An order may move through placement, stock locking, payment, risk review, shipping, refund, and reconciliation. A university process may combine credits, a final project, asset return, and approvals.

A status column can encode stages. Boolean fields can encode more details. Neither representation explains how the current state came from earlier facts. A bug or override can create a record that means both “eligible” and “not eligible.”

[Teaching example] A prerequisite result may change after a student passes a later course. A direct update must find every affected field. A missed update creates a false current state.

[Editorial caveat] Event Sourcing is not a universal replacement for CRUD. It can help when history, audit, replay, or dependency analysis has real value. It adds operational costs.

## 10. Separate Past, Present, and Future

[Course point] Double-entry bookkeeping requires total debit to equal total credit. Debit and credit are accounting directions. They do not always mean an increase or a decrease. Assets equal liabilities plus equity. A balanced entry can still use the wrong account.

Event Sourcing records accepted facts and derives a current view from them. A persistent history records what happened. A command records a desired action. A reducer applies rules and produces a view.

A correction adds a new fact. It must not silently erase an earlier accepted fact. An expected future result is not a fact.

The lecture uses “LLM as a Compiler.” A language model proposes accounting actions from source material. Ledger code checks action shape and constraints. Human review checks business meaning.

[Teaching example] A cash expense of 75 and interest income of 22.07 produce a net cash change of minus 52.93. Shared rules update several statements.

A replay can recompute a view. It must not repeat an external payment. The system must keep the rule version and external inputs for a historical result.

[Editorial caveat] Event Sourcing separates facts, views, and expectations. It does not remove essential complexity. It changes the main problem from state repair to computation and history management.

## 11. Academic Records: Trace the Graduation Result

[Course point] A student record may contain grades, passed courses, total credits, category credits, and a graduation result. These values do not all have the same status.

A grade and an approved substitution can act as source facts. Rules derive passed-course lists. Credit calculations use that result and the applicable curriculum. Graduation eligibility combines those results with separate conditions.

The dependency chain should remain visible:

1. Record enrollment, grade, recognition, and approval facts.
2. Compute passed courses with substitution and duplicate rules.
3. Compute category credits under a curriculum version.
4. Check final project, asset return, policy, and approval conditions.
5. Produce a graduation conclusion with its input references.

A corrected grade should trigger a new calculation. The system should explain which conclusion changed and why. An approval should record its subject, scope, and reason.

[Editorial caveat] Passing course conditions do not equal all graduation conditions. A direct “approved” flag without evidence hides the dependency chain. A cached result needs a rebuild path.

## 12. From State Consistency to Computation Correctness

[Course point] The lecture criticizes systems that store many derived fields as independent values. It calls the issue a “Billion Dollar Mistake.”

[Editorial caveat] This phrase is course rhetoric, not a formal defect claim. A `can_graduate` flag may become stale when a grade or curriculum changes.

SQL can express queries, views, constraints, and materialized views. The wider issue crosses database logic, application logic, caches, and interface state. The system needs an explicit dependency account.

MVVM, React, dataflow systems, and Event Sourcing expose different kinds of derived state. They do not share one mechanism. They share a design question: what is the source, and how does the result follow from it?

A source of truth contains enough facts to rebuild other information. A cache may improve speed. An index may improve search. Both need a rebuild path. A human decision should keep its evidence. A computable result should usually remain derived.

This approach changes the central risk. The team spends less effort keeping snapshots equal. The team spends more effort proving calculations. A calculation can run again. A test can check it. An audit can inspect it.

[Editorial caveat] The design still needs rule versions, time boundaries, permissions, and controls for external side effects. “Now comes from the past” is a traceability principle, not a promise that every calculation is correct.

## Task Decomposition Note (Editorial Application)

The following split is an editorial application of the lecture ideas. It is not a claim from the lecture and it is not an ASD-STE100 rule.

- Facts owner: records accepted facts and their evidence.
- Rule owner: defines the business rules and their versions.
- Read model writer: builds a query view from facts and rules.
- Test contracts: check interfaces, invariants, and representative calculations.

Keep ownership explicit. Keep each contract testable. Treat a read model as derived output, not as a new fact.

## Bilingual Term List / 中英术语表

- intent: 意图
- specification: 规约；规格说明
- implementation: 实现
- essential complexity: 本质复杂性
- accidental complexity: 附带复杂性
- solution space: 解空间
- composition: 组合
- relational model: 关系模型
- transaction: 事务
- view: 视图；展示结果
- Model, View, Controller: 模型、视图、控制器
- ViewState: 界面状态
- ViewModel: 视图模型
- derived state: 派生状态
- data dependency: 数据依赖
- fact: 事实
- event: 事件
- command: 命令；期望动作
- persistent history: 持久历史
- replay: 重放
- reducer: 归约器；按规则计算状态的程序
- source of truth: 权威事实依据（按领域界定）
- rule version: 规则版本
- external side effect: 外部副作用

## Use and Source Notes

Style target: approximately 80 percent similarity to ASD-STE100. This target is qualitative. It is not compliance, certification, or a full dictionary audit.

The official site identifies Issue 9 (15 January 2025). Part 1 gives 53 writing rules. Part 2 gives about 900 approved words. Rules 5.1 and 6.3 limit procedural and descriptive sentences to 20 and 25 words. Rule 3.6 requires active voice unless a description has an unknown agent.

Official ASD-STE100 sources:

- ASD-STE100 FAQ: https://www.asd-ste100.org/STE_faq.html
- ASD-STE100 overview: https://www.asd-ste100.org/about_STE.html
- ASD-STE100 downloads, Issue 9: https://www.asd-ste100.org/STE_downloads.html
- ASD-STE100 Issue 9 PDF: https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf

Course attribution: Jiang Yanyan. The lecture and slides use CC BY-NC 4.0. This adaptation uses the Linbol videobook for noncommercial study.

Course references:

- Course lecture: https://jyywiki.cn/GSE/2026/lect7.md
- Videobook page: https://linbol.top/videobook/%E9%9C%80%E6%B1%82%E5%92%8C%E6%9E%B6%E6%9E%84%20%282%29%20%5B07-Raw%EF%BC%8F26%E7%94%9F%E6%88%90%E5%BC%8F%E8%BD%AF%E4%BB%B6%E5%B7%A5%E7%A8%8B%EF%BC%8FNJU%5D/book.html
- License: https://creativecommons.org/licenses/by-nc/4.0/
