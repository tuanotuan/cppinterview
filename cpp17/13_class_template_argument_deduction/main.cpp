#include <iostream>
#include <numeric>
#include <type_traits>
#include <utility>
#include <vector>

int main() {
    std::pair point{3, 4};
    std::vector values{1, 2, 3};

    static_assert(std::is_same_v<decltype(point), std::pair<int, int>>);
    static_assert(std::is_same_v<decltype(values), std::vector<int>>);

    std::cout << "point: " << point.first << ',' << point.second << '\n';
    std::cout << "sum: "
              << std::accumulate(values.begin(), values.end(), 0) << '\n';
}
