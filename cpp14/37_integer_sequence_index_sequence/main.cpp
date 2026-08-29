#include <cstddef>
#include <iostream>
#include <string>
#include <tuple>
#include <utility>

template <class Tuple, std::size_t... I>
void print_tuple_impl(const Tuple& tuple, std::index_sequence<I...>) {
    int sink[] = {0, ((void)(std::cout << (I == 0 ? "" : ", ")
                                            << std::get<I>(tuple)), 0)...};
    (void)sink;
    std::cout << "\n";
}

template <class... Types>
void print_tuple(const std::tuple<Types...>& tuple) {
    print_tuple_impl(tuple, std::index_sequence_for<Types...>{});
}

int main() {
    const auto row = std::make_tuple(1, std::string("An"), 9.5);
    print_tuple(row);
}
