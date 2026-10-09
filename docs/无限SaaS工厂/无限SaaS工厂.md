# 无限 SaaS 工厂

> 作者：Satya Nadella（[@satyanadella](https://x.com/satyanadella)）  
> 原文：[The Infinite SaaS Factory](https://x.com/satyanadella/status/2108213283144810958)  
> 翻译 Url：[https://github.com/samz406/local_wenzhang/blob/main/docs/无限SaaS工厂/无限SaaS工厂.md](https://github.com/samz406/local_wenzhang/blob/main/docs/无限SaaS工厂/无限SaaS工厂.md)

我们今天的许多工作，仍然是在迁就软件：不断切换应用，每换一次就重新拼凑上下文，再把真正想做的事，翻译成每套系统所要求的一连串操作。

AI 正在改变这一切。它让软件开始围绕工作来组织，而不是让人围着软件转。

软件开发是最早大规模采用 Agent 的领域之一，我们已经从中看到了这场转变的雏形。随着 Agent 式开发不断发展，GitHub 上新建代码仓库的速度越来越快，Pull Request 和 Commit 活动也持续增长。这里的启示是：Agent 变多，并不会削弱权威记录系统的重要性；恰恰相反，我们比以往任何时候都更需要可信的场所来维护信息、协调变更和管理状态。销售、客户服务、财务与运营领域，也正在呈现同样的趋势。

正因如此，我们希望把 Copilot 打造成一套[全新的工作操作系统](https://x.com/satyanadella/status/2103455884366188544)，覆盖每一种模型、每一种设备形态和每一类任务。

但像 Copilot 这样的新前台——也就是“头部”——只完成了一半。我们还需要一个受到治理的底层基础，把过去封闭在各个 CRM、ERP 及其他应用内部的业务逻辑与上下文释放出来，交给 Agent 使用。这就是“无头层”。

归根结底，只有获得正确的上下文和可以采取行动的工具，模型的智能才能真正为企业创造价值。我们需要一套系统，既能理解一个人的意图，又能引入相关的组织与业务背景，还能调用正确的工作流。

对微软而言，这意味着把三层能力连接起来：作为多模型 Harness 与 Agent 层的 Copilot，我们各类应用中的业务逻辑，以及这些应用所依赖的权威记录系统；此外，还要通过连接器接入其他数据源。Microsoft IQ 负责把这些层贯通起来。

这让 Copilot 和 Agent 能够深入理解企业：把组织知识同业务数据、流程与工具连接起来，让它们既能围绕工作进行推理，又能在企业规则范围内采取行动。这里要做的，不只是把已有 API 暴露给大语言模型，而是要为 AI 重新设计业务上下文本身。

这就是为什么我们今天为 Dynamics 365 Sales、Service 和 Customer Insights 发布了 30 多项新的 Copilot Skill。正如 [Jeff 在这里所解释的](https://www.microsoft.com/en-us/copilot/blog/2026/10/08/bringing-crm-into-the-flow-of-work-and-agents-into-business-process-for-sales-and-service-teams/)，这些 Skill 会把 CRM 能力直接带进日常工作过程。而对我们来说，这仅仅是开始。

借助这些 Skill，你可以在 Chat、Cowork、Autopilot，甚至 Code 中使用 Copilot，完成更多贯穿企业业务全流程的端到端工作。

但这并不只是让 Copilot 帮你把工作做完。

我们还推出了 [Microsoft Copilot Managed Runtime](https://www.microsoft.com/en-us/copilot/blog/copilot-studio/build-where-you-want-run-with-confidence-now-microsoft-hosts-and-manages-the-code-created-by-copilot/)。它提供托管基础设施，让代码能够在 IT 治理之下，安全地运行于企业自己的环境中。

把这一切组合起来，得到的将远比在 SaaS 里再塞进一个 AI 功能强大得多。你会开始拥有一种我称之为“无限 SaaS 工厂”的东西。

想象一下：你只需进入 Copilot 的 Code，描述自己的业务需求，就能构建一项定制功能，甚至创建一个全新的 SaaS 模块。借助这些插件与 Skill，你可以扩展 Dataverse Schema，复用已有业务逻辑，并创建新的体验与工作流，同时继续连接企业已经赖以运转的那些系统。

我们正在进入真正“个人化”软件的新时代。每个人都可以轻松地按照自己的工作方式定制应用，同时又保持与企业既有权威记录系统的连接，避免那些最重要的系统被割裂成新的信息孤岛。

而且，机会远不只是扩展今天已有的系统。我们可以为 Agent 时代重新发明权威记录系统：让它们承受 Agent 的高频访问，把分散在不同数据源里的上下文与智能汇聚起来，并且原生地与 Copilot 这样的智能助手协作。对一些客户而言，这意味着扩展现有系统；对另一些客户而言，则意味着替换现有系统。

有了 Code 和这些底层 Skill，整个过程几乎没有摩擦：你可以快速定制自己构建的东西，也可以随着业务变化，轻松把一个项目中的成果调整后用于另一个项目。

更重要的是，这条路线并不是要让大语言模型包办一切。由于这些 Skill 与企业权威记录系统深度集成，我们可以只在智能真正创造价值的地方使用 Token；而当确定性软件执行得更快、更便宜、更可靠时，就让它负责执行。

我相信，这一切能够重新定义企业 SaaS。

真正的机会，是为 Agent 时代重新发明权威记录系统，而不是只在它们上面叠加新的交互体验；同时，为每一家企业提供一种全新的工作编排方式，让企业能够亲手构建自己还缺少的东西。

这就是微软正在前往的方向：让 Copilot 成为一套新的工作操作系统，并在其中内置一个受到治理的无限 SaaS 工厂。
