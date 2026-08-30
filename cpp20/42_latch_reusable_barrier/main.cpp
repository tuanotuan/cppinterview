// Day 42: Latch and Reusable Barrier
#include <atomic>
#include <barrier>
#include <iostream>
#include <latch>
#include <thread>

int main() {
    std::atomic<int> sum{0};
    std::latch done{2};
    std::jthread first{[&] { sum.fetch_add(1); done.count_down(); }};
    std::jthread second{[&] { sum.fetch_add(2); done.count_down(); }};
    done.wait();

    int phases = 0;
    {
        std::barrier sync{2, [&]() noexcept { ++phases; }};
        std::jthread a{[&] { sync.arrive_and_wait(); sync.arrive_and_wait(); }};
        std::jthread b{[&] { sync.arrive_and_wait(); sync.arrive_and_wait(); }};
    }

    std::cout << "latch sum = " << sum.load() << '\n';
    std::cout << "barrier phases = " << phases << '\n';
}
