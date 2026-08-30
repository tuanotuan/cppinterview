// Day 25: using enum, char8_t, and Safe Integral Comparisons
#include <iostream>
#include <utility>

enum class State { idle, running };

int main() {
    using enum State;
    State state = running;
    char8_t unit = u8'C';

    std::cout << std::boolalpha;
    std::cout << "running = " << (state == running) << '\n';
    std::cout << "UTF-8 unit = " << static_cast<unsigned int>(unit) << '\n';
    std::cout << "-1 < 1u = " << std::cmp_less(-1, 1u) << '\n';
}
