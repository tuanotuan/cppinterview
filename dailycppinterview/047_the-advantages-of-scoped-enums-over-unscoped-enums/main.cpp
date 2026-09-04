// Real-World C++ Interviews Q047: What are the advantages of scoped enums over unscoped enums?
// Key: A scoped enum (`enum class`) keeps enumerators in its scope, avoids implicit conversion
// to integers, and allows an explicit underlying type. These properties reduce name collisions
// and accidental arithmetic.
#include <type_traits>

enum class Color : unsigned char { red, green, blue };

int main() {
    static_assert(std::is_same_v<std::underlying_type_t<Color>, unsigned char>);
    constexpr auto color = Color::green;
    return color == Color::green ? 0 : 1;
}
