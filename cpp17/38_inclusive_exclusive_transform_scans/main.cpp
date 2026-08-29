#include <array>
#include <functional>
#include <iostream>
#include <numeric>

template <class Range>
void print(const char* label, const Range& values) {
    std::cout << label;
    for (int value : values) std::cout << ' ' << value;
    std::cout << '\n';
}

int main() {
    const std::array<int, 4> input{{1, 2, 3, 4}};
    std::array<int, 4> inclusive{};
    std::array<int, 4> exclusive{};
    std::array<int, 4> squares{};

    std::inclusive_scan(input.begin(), input.end(), inclusive.begin());
    std::exclusive_scan(input.begin(), input.end(), exclusive.begin(), 0);
    std::transform_inclusive_scan(
        input.begin(), input.end(), squares.begin(), std::plus<>{},
        [](int value) { return value * value; });

    print("inclusive:", inclusive);
    print("exclusive:", exclusive);
    print("squared:", squares);
}
