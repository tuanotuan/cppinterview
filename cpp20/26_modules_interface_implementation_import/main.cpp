// Day 26: Module Interfaces, Implementation Units, and import
#include <array>
#include <iostream>
#include <string_view>

int main() {
    constexpr std::array<std::string_view, 3> units{
        "export module math;\nexport int add(int, int);",
        "module math;\nint add(int a, int b) { return a + b; }",
        "import math;\nint main() { return add(2, 3) != 5; }"
    };

    constexpr std::array labels{"interface", "implementation", "importer"};
    for (std::size_t i = 0; i < units.size(); ++i) {
        std::cout << "[" << labels[i] << "]\n" << units[i] << "\n\n";
    }
}
