export const TICK_DATA_GUIDE_CHAPTERS = [
  {
    id: "market-first-principles",
    number: "01",
    title: "Book đang lưu cái gì?",
    shortTitle: "Bid, ask và spread",
  },
  {
    id: "tick-event-pipeline",
    number: "02",
    title: "Tick không đồng nghĩa với trade",
    shortTitle: "Event pipeline",
  },
  {
    id: "safe-binary-parsing",
    number: "03",
    title: "Từ wire bytes thành event an toàn",
    shortTitle: "Binary parsing",
  },
  {
    id: "mbo-mbp",
    number: "04",
    title: "MBO, MBP và order lifecycle",
    shortTitle: "Dựng order book",
  },
  {
    id: "sequencing-recovery",
    number: "05",
    title: "Sequence gap và recovery",
    shortTitle: "Continuity",
  },
  {
    id: "trade-statistics",
    number: "06",
    title: "Trade tape, OHLCV và correction",
    shortTitle: "Statistics",
  },
  {
    id: "interview-framework",
    number: "07",
    title: "Khung trả lời phỏng vấn",
    shortTitle: "Interview framework",
  },
] as const;

export const TICK_DATA_GUIDE_SOURCES = [
  {
    label: "Nasdaq TotalView-ITCH 5.0",
    description:
      "Wire format, order lifecycle, executions, trade print và broken trade.",
    href: "https://www.nasdaqtrader.com/content/technicalsupport/specifications/dataproducts/NQTVITCHSpecification.pdf",
  },
  {
    label: "Nasdaq MoldUDP64",
    description:
      "Message sequencing, heartbeat và retransmission request.",
    href: "https://www.nasdaqtrader.com/content/technicalsupport/specifications/dataproducts/moldudp64.pdf",
  },
  {
    label: "CME Central Limit Order Book",
    description:
      "Market-by-Price, depth và aggregate quantity theo price level.",
    href: "https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457640186/MDP+3.0+-+Central+Limit+Order+Book",
  },
  {
    label: "CME Incremental Feed Arbitration",
    description:
      "Cách dùng Feed A/B để tạo một logical ordered stream.",
    href: "https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457672396/MDP+3.0+-+Incremental+Feed+Arbitration",
  },
  {
    label: "CME MBP/MBOFD Recovery",
    description:
      "Snapshot cutover, live queue và LastMsgSeqNumProcessed.",
    href: "https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457672425/MDP+3.0+-+MBP+and+MBOFD+Market+Recovery",
  },
  {
    label: "CME Inverted Price Book",
    description:
      "Instrument metadata và priority khác normal price convention.",
    href: "https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457605769/MDP+3.0+-+Inverted+Price+Book+Processing",
  },
  {
    label: "NYSE Pillar Integrated Feed",
    description:
      "Trade, cancel/correction, printability và market-data timestamps.",
    href: "https://www.nyse.com/publicdocs/nyse/data/NYSE_Pillar_Integrated_Feed_Client_Specification_v2.5.pdf",
  },
] as const;

export const TICK_DATA_REPO_LESSONS = [
  {
    lessonId: "cpp20-tick-event-model-and-binary-parsing",
    label: "Safe binary parsing",
    href: "https://github.com/tuanotuan/modern-cpp-features/blob/main/cpp20/02_tick%20event%20model%20and%20binary%20parsing/knowledge.md",
  },
  {
    lessonId: "cpp20-market-by-order-reconstruction",
    label: "Market-by-Order reconstruction",
    href: "https://github.com/tuanotuan/modern-cpp-features/blob/main/cpp20/03_market%20by%20order%20reconstruction/knowledge.md",
  },
  {
    lessonId: "cpp20-market-by-price-and-book-invariants",
    label: "Market-by-Price và invariants",
    href: "https://github.com/tuanotuan/modern-cpp-features/blob/main/cpp20/04_market%20by%20price%20and%20book%20invariants/knowledge.md",
  },
  {
    lessonId: "cpp20-sequencing-gaps-and-recovery",
    label: "Sequencing, gaps và recovery",
    href: "https://github.com/tuanotuan/modern-cpp-features/blob/main/cpp20/05_sequencing%20gaps%20and%20recovery/knowledge.md",
  },
  {
    lessonId: "cpp20-trade-statistics-timestamps-and-corrections",
    label: "Trade statistics và corrections",
    href: "https://github.com/tuanotuan/modern-cpp-features/blob/main/cpp20/06_trade%20statistics%20timestamps%20and%20corrections/knowledge.md",
  },
] as const;
