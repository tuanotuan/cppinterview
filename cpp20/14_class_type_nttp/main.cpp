// Day 14: Class Types as Non-Type Template Parameters
#include <cstddef>
#include <iostream>

template<std::size_t N>
struct FixedString {
    char data[N]{};

    constexpr FixedString(const char (&text)[N]) {
        for (std::size_t i = 0; i < N; ++i) {
            data[i] = text[i];
        }
    }
};

template<std::size_t N>
FixedString(const char (&)[N]) -> FixedString<N>;

template<FixedString Name>
void greet() {
    std::cout << "Hello, " << Name.data << "!\n";
}

int main() {
    greet<"Ada">();
    greet<"Lin">();
}
