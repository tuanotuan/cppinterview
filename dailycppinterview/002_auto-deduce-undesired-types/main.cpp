// Real-World C++ Interviews Q002: When can auto deduce undesired types?
// Key: `auto` preserves the initializer's actual expression type, which can be an invisible
// proxy such as `std::vector<bool>::reference` rather than `bool`. Force the intended value
// type when a proxy could outlive its owner or expose surprising behavior.
#include <type_traits>

int main() {
    const int source = 2;
    auto value = source;
    const auto& view = source;
    static_assert(std::is_same_v<decltype(value), int>);
    static_assert(std::is_same_v<decltype(view), const int&>);
}
