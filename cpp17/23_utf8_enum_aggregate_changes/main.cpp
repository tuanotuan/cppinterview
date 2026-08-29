#include <iostream>
#include <type_traits>

enum class Byte : unsigned char {};

struct Base {
    int x;
};

struct Point : Base {
    int y;
};

int main() {
    const auto letter = u8'A';
    const Byte byte{42};
    const Point point{{3}, 4};

    static_assert(std::is_same_v<decltype(letter), const char>);
    std::cout << "letter: " << letter << '\n';
    std::cout << "byte: " << static_cast<int>(byte) << '\n';
    std::cout << "point: " << point.x << ',' << point.y << '\n';
}
