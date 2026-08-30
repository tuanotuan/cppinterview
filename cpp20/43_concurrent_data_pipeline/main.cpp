// Day 43: Designing a Concurrent Data Pipeline
#include <future>
#include <iostream>
#include <numeric>
#include <utility>
#include <vector>

int main() {
    auto produced = std::async(std::launch::async, [] {
        return std::vector<int>{1, 2, 3, 4};
    });

    auto transformed = std::async(std::launch::async,
        [input = std::move(produced)]() mutable {
            auto values = input.get();
            for (int& value : values) {
                value *= 2;
            }
            return values;
        });

    auto reduced = std::async(std::launch::async,
        [input = std::move(transformed)]() mutable {
            auto values = input.get();
            return std::accumulate(values.begin(), values.end(), 0);
        });

    std::cout << "pipeline sum = " << reduced.get() << '\n';
}
