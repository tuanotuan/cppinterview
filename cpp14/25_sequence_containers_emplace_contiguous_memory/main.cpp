#include <iostream>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::vector<std::pair<int, std::string>> rows;
    rows.reserve(2);
    rows.emplace_back(1, "one");
    rows.emplace_back(2, "two");

    for (const auto& row : rows) {
        std::cout << row.first << ": " << row.second << "\n";
    }

    const auto* first = &rows[0];
    const auto* second = &rows[1];
    std::cout << "contiguous: " << (second == first + 1) << "\n";
}
