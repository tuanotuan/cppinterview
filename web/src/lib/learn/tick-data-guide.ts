export const TICK_DATA_GUIDE_CHAPTERS = [
  {
    id: "market-first-principles",
    number: "01",
    title: "Sổ lệnh đang lưu điều gì?",
    shortTitle: "Bid, ask và chênh lệch giá",
  },
  {
    id: "tick-event-pipeline",
    number: "02",
    title: "Tick không đồng nghĩa với giao dịch",
    shortTitle: "Luồng xử lý sự kiện",
  },
  {
    id: "safe-binary-parsing",
    number: "03",
    title: "Từ chuỗi byte trên đường truyền thành sự kiện an toàn",
    shortTitle: "Phân tích dữ liệu nhị phân",
  },
  {
    id: "mbo-mbp",
    number: "04",
    title: "MBO, MBP và vòng đời lệnh",
    shortTitle: "Dựng sổ lệnh",
  },
  {
    id: "sequencing-recovery",
    number: "05",
    title: "Thiếu số thứ tự và phục hồi dữ liệu",
    shortTitle: "Tính liên tục",
  },
  {
    id: "trade-statistics",
    number: "06",
    title: "Dòng giao dịch, OHLCV và điều chỉnh",
    shortTitle: "Thống kê",
  },
  {
    id: "interview-framework",
    number: "07",
    title: "Khung trả lời phỏng vấn",
    shortTitle: "Khung phỏng vấn",
  },
] as const;

export const TICK_DATA_GUIDE_SOURCES = [
  {
    label: "Nasdaq TotalView-ITCH 5.0",
    description:
      "Định dạng dữ liệu truyền, vòng đời lệnh, khớp lệnh, bản tin giao dịch và giao dịch bị hủy.",
    href: "https://www.nasdaqtrader.com/content/technicalsupport/specifications/dataproducts/NQTVITCHSpecification.pdf",
  },
  {
    label: "Nasdaq MoldUDP64",
    description:
      "Thứ tự thông điệp, bản tin nhịp (heartbeat) và yêu cầu truyền lại.",
    href: "https://www.nasdaqtrader.com/content/technicalsupport/specifications/dataproducts/moldudp64.pdf",
  },
  {
    label: "CME Central Limit Order Book",
    description:
      "Market-by-Price, độ sâu và tổng khối lượng theo từng mức giá.",
    href: "https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457640186/MDP+3.0+-+Central+Limit+Order+Book",
  },
  {
    label: "CME Incremental Feed Arbitration",
    description:
      "Cách dùng nguồn A/B để tạo một luồng dữ liệu logic có thứ tự.",
    href: "https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457672396/MDP+3.0+-+Incremental+Feed+Arbitration",
  },
  {
    label: "CME MBP/MBOFD Recovery",
    description:
      "Chuyển từ ảnh chụp trạng thái (snapshot) sang dữ liệu trực tiếp, hàng chờ trực tiếp và LastMsgSeqNumProcessed.",
    href: "https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457672425/MDP+3.0+-+MBP+and+MBOFD+Market+Recovery",
  },
  {
    label: "CME Inverted Price Book",
    description:
      "Thông tin mô tả công cụ và quy tắc ưu tiên khác quy ước giá thông thường.",
    href: "https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457605769/MDP+3.0+-+Inverted+Price+Book+Processing",
  },
  {
    label: "NYSE Pillar Integrated Feed",
    description:
      "Giao dịch, hủy hoặc điều chỉnh, khả năng công bố và mốc thời gian dữ liệu thị trường.",
    href: "https://www.nyse.com/publicdocs/nyse/data/NYSE_Pillar_Integrated_Feed_Client_Specification_v2.5.pdf",
  },
] as const;

export const TICK_DATA_REPO_LESSONS = [
  {
    lessonId: "cpp20-tick-event-model-and-binary-parsing",
    label: "Phân tích dữ liệu nhị phân an toàn",
    href: "https://github.com/tuanotuan/modern-cpp-features/blob/main/cpp20/02_tick%20event%20model%20and%20binary%20parsing/knowledge.md",
  },
  {
    lessonId: "cpp20-market-by-order-reconstruction",
    label: "Dựng lại sổ lệnh Market-by-Order",
    href: "https://github.com/tuanotuan/modern-cpp-features/blob/main/cpp20/03_market%20by%20order%20reconstruction/knowledge.md",
  },
  {
    lessonId: "cpp20-market-by-price-and-book-invariants",
    label: "Market-by-Price và các bất biến của sổ lệnh",
    href: "https://github.com/tuanotuan/modern-cpp-features/blob/main/cpp20/04_market%20by%20price%20and%20book%20invariants/knowledge.md",
  },
  {
    lessonId: "cpp20-sequencing-gaps-and-recovery",
    label: "Thứ tự, phần dữ liệu thiếu và phục hồi",
    href: "https://github.com/tuanotuan/modern-cpp-features/blob/main/cpp20/05_sequencing%20gaps%20and%20recovery/knowledge.md",
  },
  {
    lessonId: "cpp20-trade-statistics-timestamps-and-corrections",
    label: "Thống kê giao dịch, mốc thời gian và điều chỉnh",
    href: "https://github.com/tuanotuan/modern-cpp-features/blob/main/cpp20/06_trade%20statistics%20timestamps%20and%20corrections/knowledge.md",
  },
] as const;
