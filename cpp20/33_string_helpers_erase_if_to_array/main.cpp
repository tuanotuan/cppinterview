// Day 33: starts_with, ends_with, contains, erase_if, and to_array
#include <algorithm>
#include <array>
#include <iostream>
#include <set>
#include <string>
#include <vector>

int main() {
    std::string text = "log:ready.txt";
    std::set<int> ids{2, 4, 8};
    std::vector values{1, 2, 3, 4};
    int raw[]{7, 8, 9};
    auto fixed = std::to_array(raw);

    std::erase_if(values, [](int x) { return x % 2 == 0; });

    std::cout << std::boolalpha;
    std::cout << text.starts_with("log:") << ' ' << text.ends_with(".txt") << '\n';
    std::cout << "contains 4 = " << ids.contains(4) << '\n';
    std::cout << "remaining = " << values[0] << ',' << values[1] << '\n';
    std::cout << "array size = " << fixed.size() << '\n';
}
