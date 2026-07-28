export const CMAKE_GUIDE_CHAPTERS = [
  {
    id: "configure-generate-build",
    number: "01",
    title: "Mô hình tư duy: cấu hình, sinh và dựng",
    shortTitle: "CMake đang làm gì?",
  },
  {
    id: "language-cache-scope",
    number: "02",
    title: "Ngôn ngữ, danh sách, phạm vi và bộ nhớ đệm",
    shortTitle: "Ngôn ngữ CMake",
  },
  {
    id: "targets-graph",
    number: "03",
    title: "Target là đơn vị thiết kế",
    shortTitle: "Đồ thị target",
  },
  {
    id: "usage-requirements",
    number: "04",
    title: "PUBLIC, PRIVATE, INTERFACE",
    shortTitle: "Phạm vi sử dụng",
  },
  {
    id: "project-architecture",
    number: "05",
    title: "Kiến trúc dự án nhiều mô-đun",
    shortTitle: "Kiến trúc dự án",
  },
  {
    id: "generators-configurations",
    number: "06",
    title: "Generator, cấu hình và trình biên dịch",
    shortTitle: "Ninja và Visual Studio",
  },
  {
    id: "generator-expressions",
    number: "07",
    title: "Biểu thức generator không phải if()",
    shortTitle: "Điều kiện khi tạo hệ thống dựng",
  },
  {
    id: "dependency-management",
    number: "08",
    title: "Quản lý quyền sở hữu thư viện phụ thuộc",
    shortTitle: "find_package & FetchContent",
  },
  {
    id: "generated-sources",
    number: "09",
    title: "Mã nguồn sinh tự động và dựng tăng dần",
    shortTitle: "Sinh mã nguồn",
  },
  {
    id: "presets-toolchains",
    number: "10",
    title: "Preset, generator và bộ công cụ",
    shortTitle: "Quy trình dựng có thể tái lập",
  },
  {
    id: "testing-quality",
    number: "11",
    title: "CTest và kiến trúc kiểm thử",
    shortTitle: "Kiểm thử đúng tầng",
  },
  {
    id: "quality-performance",
    number: "12",
    title: "Cảnh báo, công cụ phát hiện lỗi và tốc độ dựng",
    shortTitle: "Chất lượng và tốc độ",
  },
  {
    id: "install-export-package",
    number: "13",
    title: "Cài đặt, xuất và cấu hình gói",
    shortTitle: "Gói sẵn sàng để sử dụng",
  },
  {
    id: "diagnostics-performance",
    number: "14",
    title: "Chẩn đoán hệ thống dựng bằng số liệu",
    shortTitle: "Chẩn đoán hệ thống dựng",
  },
  {
    id: "legacy-migration-ci",
    number: "15",
    title: "Chuyển đổi hệ thống cũ từng bước",
    shortTitle: "Hệ thống cũ → hiện đại + CI",
  },
  {
    id: "worldquant-capstone",
    number: "16",
    title: "Bài tổng hợp theo mô tả công việc WorldQuant",
    shortTitle: "Phỏng vấn và bàn giao",
  },
] as const;

export const CMAKE_GUIDE_SOURCES = [
  {
    label: "CMake Tutorial",
    description:
      "Luồng học chính thức từ dự án cơ bản tới lệnh dành cho target, kiểm thử và cài đặt.",
    href: "https://cmake.org/cmake/help/latest/guide/tutorial/index.html",
  },
  {
    label: "User Interaction Guide",
    description:
      "Thư mục mã nguồn, thư mục dựng, các bước cấu hình, biên dịch, cài đặt và cách gọi CMake/CTest.",
    href: "https://cmake.org/cmake/help/latest/guide/user-interaction/index.html",
  },
  {
    label: "cmake-language(7)",
    description:
      "Cú pháp, đối số, danh sách, biến, bộ nhớ đệm, hàm, macro và phạm vi.",
    href: "https://cmake.org/cmake/help/latest/manual/cmake-language.7.html",
  },
  {
    label: "cmake-buildsystem(7)",
    description:
      "Thuộc tính target, phạm vi sử dụng và cách cấu hình dựng được truyền qua chuỗi phụ thuộc.",
    href: "https://cmake.org/cmake/help/latest/manual/cmake-buildsystem.7.html",
  },
  {
    label: "Using Dependencies Guide",
    description:
      "find_package, target được nhập, FetchContent và nhà cung cấp thư viện phụ thuộc.",
    href: "https://cmake.org/cmake/help/latest/guide/using-dependencies/index.html",
  },
  {
    label: "FetchContent",
    description:
      "Nạp thư viện phụ thuộc trong bước cấu hình, cố định phiên bản và đưa target vào đồ thị.",
    href: "https://cmake.org/cmake/help/latest/module/FetchContent.html",
  },
  {
    label: "add_custom_command",
    description:
      "OUTPUT, DEPENDS, BYPRODUCTS, DEPFILE và quy tắc để quá trình dựng tăng dần hoạt động đúng.",
    href: "https://cmake.org/cmake/help/latest/command/add_custom_command.html",
  },
  {
    label: "Generator Expressions",
    description:
      "Điều kiện theo cấu hình hoặc trình biên dịch và BUILD_INTERFACE/INSTALL_INTERFACE.",
    href: "https://cmake.org/cmake/help/latest/manual/cmake-generator-expressions.7.html",
  },
  {
    label: "cmake-presets(7)",
    description:
      "Cấu hình đặt sẵn (preset) cho bước cấu hình, dựng, kiểm thử và quy trình; cơ chế kế thừa và tệp cá nhân.",
    href: "https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html",
  },
  {
    label: "cmake-toolchains(7)",
    description:
      "Nhận diện trình biên dịch, tệp mô tả bộ công cụ và biên dịch chéo.",
    href: "https://cmake.org/cmake/help/latest/manual/cmake-toolchains.7.html",
  },
  {
    label: "Testing and CTest",
    description:
      "enable_testing, add_test, cấu hình đa chế độ và lệnh chạy kiểm thử.",
    href: "https://cmake.org/cmake/help/latest/guide/tutorial/Testing%20and%20CTest.html",
  },
  {
    label: "Importing and Exporting Guide",
    description:
      "Target được nhập, install(EXPORT), namespace và cách dự án khác sử dụng gói.",
    href: "https://cmake.org/cmake/help/latest/guide/importing-exporting/index.html",
  },
  {
    label: "cmake-packages(7)",
    description:
      "Gói cấu hình, tệp phiên bản, find_dependency và gói có thể di chuyển.",
    href: "https://cmake.org/cmake/help/latest/manual/cmake-packages.7.html",
  },
  {
    label: "cmake-policies(7)",
    description:
      "Vòng đời chính sách, khoảng phiên bản và chiến lược nâng cấp dự án cũ.",
    href: "https://cmake.org/cmake/help/latest/manual/cmake-policies.7.html",
  },
  {
    label: "cmake(1)",
    description:
      "Giao diện dòng lệnh chính thức: --fresh, --trace-expand, --debug-find, --graphviz và lệnh dựng.",
    href: "https://cmake.org/cmake/help/latest/manual/cmake.1.html",
  },
] as const;

export const CMAKE_WORLDQUANT_OUTCOMES = [
  {
    label: "Làm chủ hệ thống cũ",
    outcome:
      "Đọc cờ toàn cục và bộ nhớ đệm cũ, khoanh vùng hành vi, rồi chuyển đổi từng target với bước kiểm tra tương đương.",
  },
  {
    label: "Nền tảng C++ hiện đại",
    outcome:
      "Mô hình hóa bộ giải mã, sổ lệnh, thống kê và công cụ thành đồ thị target có quyền sở hữu rõ ràng.",
  },
  {
    label: "Thêm nguồn dữ liệu mới",
    outcome:
      "Thêm mã giao thức sinh tự động và bộ chuyển đổi nguồn dữ liệu mà quy trình dựng tăng dần vẫn đúng.",
  },
  {
    label: "Người dùng nghiên cứu",
    outcome:
      "Xuất gói có thể di chuyển để công cụ nghiên cứu bằng Python và các dự án C++ khác sử dụng ổn định.",
  },
  {
    label: "Tiêu chuẩn phần mềm",
    outcome:
      "Chạy CTest, sanitizer, kiểm tra cảnh báo, kiểm tra nhanh sau cài đặt và nhiều trình biên dịch trong CI.",
  },
  {
    label: "Năng lực thể hiện khi phỏng vấn",
    outcome:
      "Giải thích được vì sao thiết kế dựa trên target phù hợp, không chỉ ghi nhớ lệnh.",
  },
] as const;
