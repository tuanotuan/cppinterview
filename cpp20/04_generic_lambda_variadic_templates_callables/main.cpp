// Day 4: Generic Lambdas, Variadic Templates, and Callables
#include <iostream>

template<class Callable>
auto use(Callable operation) {
    return operation(1, 2.5, 3);
}

int main() {
    auto sum = [](auto... values) {
        return (values + ...); // Expands the parameter pack.
    };

    std::cout << "sum = " << use(sum) << '\n';
}
