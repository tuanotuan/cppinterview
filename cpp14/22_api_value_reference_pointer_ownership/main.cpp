#include <iostream>
#include <memory>
#include <vector>

void increment(int& value) { ++value; }

const int* find_value(const std::vector<int>& values, int target) {
    for (const int& value : values) {
        if (value == target) return &value; // nullable borrow
    }
    return nullptr;
}

std::unique_ptr<int> make_score(int value) {
    return std::make_unique<int>(value);
}

int main() {
    int count = 4;
    increment(count);
    const std::vector<int> values{2, 5, 8};
    const int* found = find_value(values, 5);
    auto score = make_score(90);
    std::cout << "count: " << count << ", found: " << *found
              << ", score: " << *score << "\n";
}
