// Day 35: source_location and osyncstream
#include <iostream>
#include <source_location>
#include <string_view>
#include <syncstream>

void log(std::string_view message,
         std::source_location where = std::source_location::current()) {
    std::osyncstream output{std::cout};
    output << "line " << where.line() << ": " << message << '\n';
}

int main() {
    log("ready"); // The default argument captures this call site.
}
