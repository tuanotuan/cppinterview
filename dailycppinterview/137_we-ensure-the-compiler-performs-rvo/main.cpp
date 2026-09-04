// Daily C++ Interview Q137: How can we ensure the compiler performs RVO?
// Key: Return a prvalue directly when possible to obtain guaranteed C++17 elision, or return
// the same named local from all relevant paths to make NRVO possible. Do not write
// `std::move(local)` in the return, because it usually prevents NRVO.
#include <string>

struct Report {
    std::string text;
};

Report create(bool detailed) {
    if (detailed) return Report{"detailed"};
    return Report{"brief"};
}

int main() {
    const auto report = create(true);
    return report.text == "detailed" ? 0 : 1;
}
