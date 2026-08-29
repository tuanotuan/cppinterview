#include <iostream>
#include <string>
#include <type_traits>
#include <utility>
#include <vector>

template <class T, class = void>
struct has_size : std::false_type {};

template <class T>
struct has_size<T, std::void_t<
    decltype(std::declval<const T&>().size())>> : std::true_type {};

int main() {
    const auto square = [](auto value) { return value * value; };
    using both = std::conjunction<
        has_size<std::vector<int>>, has_size<std::string>>;
    using either = std::disjunction<has_size<int>, has_size<std::string>>;

    std::cout << "int has size: " << has_size<int>::value << '\n';
    std::cout << "both sized: " << both::value << '\n';
    std::cout << "either sized: " << either::value << '\n';
    std::cout << "callable: "
              << std::is_invocable_r_v<int, decltype(square), int> << '\n';
}
