#include <iostream>
#include <string>
#include <vector>

std::vector<std::string> make_words() {
    return {"C++23"};
}

int main() {
#if defined(__cpp_range_based_for) && __cpp_range_based_for >= 202211L
    // C++23 keeps supporting temporaries alive through the loop.
    for (char letter : make_words().front())
        std::cout << letter;
#else
    auto words = make_words();
    for (char letter : words.front())
        std::cout << letter;
#endif
    std::cout << '\n';
}
