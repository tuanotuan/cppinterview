#include <iostream>
#include <type_traits>

int main() {
    // One Vietnamese code point uses three UTF-8 code units.
    constexpr char8_t text[] = u8"Vi\u1EC7t";

    static_assert(std::is_same_v<
                  std::remove_cvref_t<decltype(text[0])>, char8_t>);

    std::cout << "UTF-8 code units=" << sizeof(text) - 1 << '\n';
}
