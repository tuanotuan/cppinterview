#include <algorithm>
#include <execution>
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    std::vector<int> values(1000);
    std::iota(values.begin(), values.end(), 0);

    std::for_each(std::execution::par, values.begin(), values.end(),
                  [](int& value) { value *= 2; });
    const int total = std::reduce(
        std::execution::par, values.begin(), values.end(), 0);

    std::cout << "first: " << values.front() << '\n';
    std::cout << "last: " << values.back() << '\n';
    std::cout << "sum: " << total << '\n';
}
