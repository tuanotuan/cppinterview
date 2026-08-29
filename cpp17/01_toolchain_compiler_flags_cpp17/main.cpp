#include <iostream>
#include <utility>

// Make the selected language mode observable at compile time.
#if __cplusplus < 201703L
#error This example requires C++17 or newer
#endif

int main() {
    // Structured bindings provide a small C++17 feature probe.
    const std::pair<int, int> values{17, 25};
    const auto [left, right] = values; // C++17 structured binding
    std::cout << "C++ level: " << __cplusplus << '\n';
    std::cout << "sum: " << left + right << '\n';
}
