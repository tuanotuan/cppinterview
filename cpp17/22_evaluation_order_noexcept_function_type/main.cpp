#include <array>
#include <iostream>
#include <type_traits>

int index() {
    std::cout << "index\n";
    return 0;
}

int produce() {
    std::cout << "value\n";
    return 42;
}

void safe_action() noexcept {
    std::cout << "safe action\n";
}

int main() {
    std::array<int, 1> values{};
    values[index()] = produce(); // right operand is sequenced first
    using Safe = void (*)() noexcept;
    Safe action = &safe_action;
    static_assert(std::is_nothrow_invocable_v<Safe>);
    std::cout << "stored: " << values[0] << '\n';
    action();
}
