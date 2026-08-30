// Day 22: Designated Initializers and Aggregate Initialization
#include <iostream>

struct Settings {
    int width{};
    int height{};
    bool fullscreen{};
};

int main() {
    Settings settings{
        .width = 800,
        .height = 600,
        .fullscreen = false
    };

    std::cout << settings.width << 'x' << settings.height << '\n';
    std::cout << std::boolalpha << settings.fullscreen << '\n';
}
