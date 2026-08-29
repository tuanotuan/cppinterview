#include <iostream>

#if __has_include(<optional>)
#include <optional>
constexpr bool has_optional = true;
#else
constexpr bool has_optional = false;
#endif

[[nodiscard]] int status() { return 0; }

int level(int input) {
    switch (input) {
    case 1:
        [[fallthrough]];
    default:
        return input * 10;
    }
}

int main() {
    [[maybe_unused]] const int debug_id = 17;
    std::cout << "optional header: " << has_optional << '\n';
    std::cout << "status: " << status() << '\n';
    std::cout << "level: " << level(1) << '\n';
}
