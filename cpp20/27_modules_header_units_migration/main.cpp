// Day 27: Modules, Header Units, and Header Migration
#include <array>
#include <iostream>
#include <string_view>

int main() {
    constexpr std::array<std::string_view, 3> migration{
        "#include <vector>       // textual inclusion",
        "import <vector>;        // header unit after toolchain setup",
        "import app.collections; // named module boundary"
    };

    for (std::string_view step : migration) {
        std::cout << step << '\n';
    }
}
