#include <iostream>
#include <vector>

decltype(auto) first(std::vector<int>& values) {
    return (values.front()); // int& because the expression is an lvalue
}

int main() {
    std::vector<int> values{10, 20, 30};
    decltype(auto) element = first(values);
    element = 99;

    std::cout << "first: " << values.front() << "\n";
}
