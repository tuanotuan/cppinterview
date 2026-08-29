#include <iostream>
#include <utility>

int main() {
    const std::pair<int, int> values{19, 23};

#if __cplusplus >= 201703L
    static_assert(__cpp_structured_bindings >= 201606L);
    const auto [left, right] = values;
    std::cout << "mode: C++17\n";
#else
    const int left = values.first;
    const int right = values.second;
    std::cout << "mode: legacy\n";
#endif

    std::cout << "sum: " << left + right << '\n';
}
