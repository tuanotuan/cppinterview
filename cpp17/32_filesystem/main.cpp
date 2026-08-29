#include <filesystem>
#include <iostream>

namespace fs = std::filesystem;

int main() {
    const fs::path input{"logs/../data/report.txt"};
    const fs::path normalized = input.lexically_normal();
    fs::path changed = normalized;
    changed.replace_extension(".csv");

    std::cout << "normalized: " << normalized.generic_string() << '\n';
    std::cout << "filename: " << normalized.filename().string() << '\n';
    std::cout << "changed: " << changed.generic_string() << '\n';
}
