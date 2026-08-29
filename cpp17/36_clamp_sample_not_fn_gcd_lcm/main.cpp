#include <algorithm>
#include <functional>
#include <iostream>
#include <numeric>
#include <random>
#include <vector>

int main() {
    const std::vector<int> values{1, 2, 3, 4, 5, 6};
    const auto is_even = [](int value) { return value % 2 == 0; };
    const auto odds = std::count_if(
        values.begin(), values.end(), std::not_fn(is_even));

    std::mt19937 engine{17};
    std::vector<int> sample;
    std::sample(values.begin(), values.end(), std::back_inserter(sample),
                3, engine);

    std::cout << "clamped: " << std::clamp(15, 0, 10) << '\n';
    std::cout << "gcd: " << std::gcd(42, 30) << '\n';
    std::cout << "lcm: " << std::lcm(21, 6) << '\n';
    std::cout << "odds: " << odds << '\n';
    std::cout << "sample size: " << sample.size() << '\n';
}
