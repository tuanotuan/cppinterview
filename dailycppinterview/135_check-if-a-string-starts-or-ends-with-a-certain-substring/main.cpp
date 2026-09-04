// Real-World C++ Interviews Q135: How to check if a string starts or ends with a certain
// substring?
// Key: Since C++20, `std::string` and `std::string_view` provide `starts_with` and `ends_with`.
// Before that, compare a prefix at position zero and compare the suffix only after checking
// that the source is at least as long as the suffix.
#include <iostream>
#include <string_view>

int main() {
    constexpr std::string_view value = "daily interview";
    std::cout << std::boolalpha << value.starts_with("daily") << ' '
              << value.ends_with("view") << '\n';
}
