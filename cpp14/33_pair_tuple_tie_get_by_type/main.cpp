#include <iostream>
#include <string>
#include <tuple>
#include <utility>

int main() {
    const std::pair<int, std::string> code{7, "seven"};
    const std::tuple<int, std::string, double> row{1, "An", 9.5};

    int id = 0;
    std::string name;
    double score = 0.0;
    std::tie(id, name, score) = row;

    std::cout << "pair: " << code.first << '-' << code.second << "\n";
    std::cout << "row: " << id << ", " << name << ", " << score << "\n";
    std::cout << "get<double>: " << std::get<double>(row) << "\n";
}
