export const LEGACY_MODERN_CAPSTONE_VERSION = 1 as const;

export type CapstoneCheck = {
  id: string;
  prompt: string;
  options: readonly { id: string; label: string }[];
  expectedOptionId: string;
  explanation: string;
};

export type CapstonePhase = {
  id: string;
  version: typeof LEGACY_MODERN_CAPSTONE_VERSION;
  title: string;
  summary: string;
  checks: readonly CapstoneCheck[];
};

export type CapstoneGrade = {
  passed: boolean;
  checks: Array<{ id: string; label: string; passed: boolean; message: string }>;
};

export const legacyModernCapstonePhases: readonly CapstonePhase[] = [
  phase("capstone-baseline", "Đóng băng điểm xuất phát", "Biết chính xác dataset, toolchain và hành vi cũ trước khi đổi mã.", [
    check("provenance", "Bản baseline cần giữ lại điều gì?", [["all", "Dataset/version, lệnh build, compiler và output baseline"], ["code", "Chỉ commit mã legacy"], ["sample", "Một ảnh chụp màn hình kết quả"]], "all", "Không thể giải thích chênh lệch nếu không tái tạo được input và môi trường cũ."),
    check("ownership", "Ai quyết định khi output legacy mơ hồ?", [["owner", "Product/data owner ghi policy trước khi migration"], ["engineer", "Engineer tự chọn giá trị có vẻ hợp lý"], ["ignore", "Bỏ case đó khỏi báo cáo"]], "owner", "Đây là quyết định dữ liệu/sản phẩm, không phải suy đoán của refactor."),
  ]),
  phase("capstone-golden", "Golden cases", "Biến hành vi cần giữ thành input/output kiểm tra được.", [
    check("sequence", "Sequence và số bản ghi so sánh thế nào?", [["exact", "So sánh chính xác, sai là chặn cutover"], ["tolerance", "Cho sai lệch nhỏ như số thực"], ["sample", "Chỉ kiểm tra một phần ngẫu nhiên"]], "exact", "Mất, lặp hoặc đảo thứ tự event là thay đổi dữ liệu, không phải sai số số thực."),
    check("floating", "Giá trị số thực có thể dùng tolerance khi nào?", [["policy", "Chỉ với tolerance/policy được đặt tên và owner duyệt"], ["always", "Luôn dùng để test ít flaky"], ["never", "Không cần kiểm tra số thực"]], "policy", "Tolerance phải có ý nghĩa miền dữ liệu, không che chênh lệch chưa hiểu."),
  ]),
  phase("capstone-adapter", "Adapter và dual-run", "Tách contract đọc dữ liệu khỏi legacy implementation để chạy hai đường song song.", [
    check("seam", "Adapter nên bao quanh đâu?", [["boundary", "Boundary đọc/chuẩn hoá feed với contract nhỏ"], ["everywhere", "Đổi đồng thời toàn bộ call site"], ["ui", "Chỉ bọc lớp hiển thị"]], "boundary", "Một seam nhỏ cho phép route legacy và modern cùng input mà không nhân bản hệ thống."),
    check("comparison", "Dual-run dùng kết quả thế nào?", [["observe", "Ghi reconciliation, chưa đổi consumer mặc định"], ["replace", "Đổi consumer sang modern ngay khi build xanh"], ["average", "Trộn hai output để giảm chênh lệch"]], "observe", "Quan sát chênh lệch trước; không che nó hoặc thay đổi hành vi người dùng sớm."),
  ]),
  phase("capstone-modernize", "Hiện đại hoá theo target", "Cải thiện ownership, warning và test mà không biến migration thành viết lại toàn bộ.", [
    check("scope", "Cờ C++ mới/warning đặt ở đâu?", [["target", "Target mới hoặc adapter target, phạm vi rõ ràng"], ["global", "CMAKE_CXX_FLAGS cho toàn repo"], ["disabled", "Tắt warning để legacy build được"]], "target", "Migration phải cô lập blast radius; legacy target giữ contract cũ đến khi có bằng chứng."),
    check("change", "Một commit modernization tốt làm gì?", [["small", "Một thay đổi có test/reconciliation rõ ràng"], ["rewrite", "Đổi API, parser và build system cùng lúc"], ["style", "Chỉ format toàn repo trước"]], "small", "Thay đổi nhỏ giúp truy vết nguyên nhân khi golden case đổi."),
  ]),
  phase("capstone-reconcile", "Reconciliation policy", "Phân loại chênh lệch để người chịu trách nhiệm có thể quyết định.", [
    check("blocks", "Điều gì luôn chặn rollout?", [["count-sequence", "Count/sequence mismatch luôn chặn"], ["all-tolerance", "Mọi mismatch dùng tolerance"], ["logs", "Chỉ cần log warning"]], "count-sequence", "Đó là invariant dữ liệu; không có tolerance chung cho event bị mất hoặc sai thứ tự."),
    check("evidence", "Báo cáo reconciliation tối thiểu cần gì?", [["identity", "Dataset identity, policy version, mismatch và quyết định owner"], ["percent", "Chỉ tỷ lệ match"], ["modern", "Chỉ output modern"]], "identity", "Báo cáo phải audit được đúng input và policy đã dùng."),
  ]),
  phase("capstone-rollout", "Shadow, canary và rollback", "Đưa platform mới vào vận hành có đường lui cụ thể.", [
    check("canary", "Canary nên thay đổi gì trước?", [["small", "Scope nhỏ, metrics/reconciliation và owner theo dõi"], ["all", "Toàn bộ feed để có dữ liệu nhanh"], ["none", "Bỏ shadow vì golden test đủ"]], "small", "Golden test không thay thế quan sát dữ liệu thực và vận hành."),
    check("rollback", "Rollback cần được chuẩn bị thế nào?", [["tested", "Trigger rõ, route/config cũ và người chịu trách nhiệm đã thử"], ["idea", "Có ý tưởng quay lại nếu cần"], ["delete", "Xoá legacy ngay khi canary bắt đầu"]], "tested", "Rollback chỉ đáng tin khi có trigger và đường thực hiện đã kiểm tra."),
  ]),
];

export function gradeLegacyModernCapstone(phaseId: string, selections: Readonly<Record<string, string>>): CapstoneGrade {
  const current = legacyModernCapstonePhases.find((item) => item.id === phaseId);
  if (!current) throw new Error(`Unknown capstone phase ${phaseId}`);
  const checks = current.checks.map((item) => ({ id: item.id, label: item.prompt, passed: selections[item.id] === item.expectedOptionId, message: item.explanation }));
  return { passed: checks.every((item) => item.passed), checks };
}

function phase(id: string, title: string, summary: string, checks: readonly CapstoneCheck[]): CapstonePhase { return { id, version: LEGACY_MODERN_CAPSTONE_VERSION, title, summary, checks }; }
function check(id: string, prompt: string, options: readonly [string, string][], expectedOptionId: string, explanation: string): CapstoneCheck { return { id, prompt, options: options.map(([optionId, label]) => ({ id: optionId, label })), expectedOptionId, explanation }; }
