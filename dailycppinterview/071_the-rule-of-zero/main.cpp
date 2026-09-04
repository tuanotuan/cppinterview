// Daily C++ Interview Q071: Explain the rule of zero
// Key: The Rule of Zero says application classes should compose RAII value types so they need
// no custom destructor, copy, or move operations. Compiler-generated special members then
// preserve correct value semantics with less code.
#include <string>
#include <vector>

struct Report {
    std::string title;
    std::vector<int> values;
};

int main() {
    Report first{"daily", {1, 2, 3}};
    Report second = first;
    Report third = std::move(second);
}
