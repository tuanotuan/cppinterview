#include <atomic>
#include <iostream>

int main() {
    std::atomic<int> state{0};

    int expected = 0;
    const bool first = state.compare_exchange_strong(expected, 1);
    std::cout << "first success: " << first << "\n";
    std::cout << "state: " << state.load() << "\n";

    expected = 0;
    const bool second = state.compare_exchange_strong(expected, 2);
    std::cout << "second success: " << second << "\n";
    std::cout << "observed state: " << expected << "\n";
}
